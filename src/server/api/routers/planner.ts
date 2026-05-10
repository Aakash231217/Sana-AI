import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { OpenAI } from "openai";
import { getPineconeClient } from "@/lib/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// ============ LESSON PLAN STYLE PROMPTS ============
// Three distinct teaching styles, each producing the same JSON schema
// so the UI can render uniformly. Each style emphasises a different
// pedagogical focus (speed, depth, balance).

const TEACHING_STYLE_BRIEFS: Record<
    "SIMPLE" | "DEEP" | "BALANCED",
    { name: string; brief: string; guidelines: string }
> = {
    SIMPLE: {
        name: "Simple School Style (Fast Learning)",
        brief:
            "Goal is FAST LEARNING and EASY UNDERSTANDING. Keep explanations short, direct and child-friendly. Focus on accuracy and speed so the student can solve problems independently.",
        guidelines: [
            "- Use very simple language for the given grade",
            "- Keep explanation short and step-by-step, no deep theory",
            "- Worked examples must be easy to moderate",
            "- Practice questions: 8-10, simple to moderate",
            "- Quick test: 3 short questions",
            "- Focus on procedural fluency over reasoning",
        ].join("\n"),
    },
    DEEP: {
        name: "Deep Concept Style",
        brief:
            "Goal is TRUE UNDERSTANDING, not just problem solving. Explain the WHY behind every concept using stories, analogies and real-life intuition. Build the concept step by step.",
        guidelines: [
            "- Lead with a Core Idea and the reasoning behind it",
            "- Use intuitive analogies (story, picture, real-life)",
            "- Build the concept step by step",
            "- Worked examples must SHOW reasoning, not just answers",
            "- Practice questions: 6-8, focused on thinking and 'why'/'how' style",
            "- Concept-check questions probe understanding, not memorisation",
            "- Avoid rote memorisation",
        ].join("\n"),
    },
    BALANCED: {
        name: "Balanced Style (Recommended)",
        brief:
            "Goal is CLEAR UNDERSTANDING + GOOD PROBLEM-SOLVING. Combine school-level clarity with conceptual insight and a real-life connection. Maintain engagement.",
        guidelines: [
            "- Clear short explanation, plus a brief 'why it works' insight",
            "- Worked examples graded easy → moderate",
            "- Practice questions: 8-10 with graded difficulty",
            "- Quick test: 3 questions",
            "- Always include 1-2 real-life applications",
            "- Balance speed with understanding",
        ].join("\n"),
    },
};

function buildLessonPlanSchemaSpec(): string {
    return `Each day MUST follow this JSON schema:
{
  "dayNumber": <number>,
  "chapterNumber": <number>,
  "topicName": "<short title of the lesson>",
  "topicsTocover": ["<topic1>", "<topic2>"],
  "objectives": ["Students will ..."],
  "prerequisites": ["What student should already know"],
  "explanation": "<simple, step-by-step explanation in 4-8 short lines>",
  "conceptInsight": "<brief 'why it works' / core idea, may be empty for SIMPLE style>",
  "workedExamples": [
    { "problem": "<question>", "solution": "<answer>", "reasoning": "<short why>" }
  ],
  "activities": ["Activity 1", "Activity 2"],
  "practiceQuestions": ["Q1", "Q2", "..."],
  "quickTest": ["Q1", "Q2", "Q3"],
  "realLifeApplication": ["Real-life example 1", "Real-life example 2"],
  "finalOutcome": "<one sentence: what the student should now be able to do>",
  "estimatedTime": 45,
  "teachingTips": "<short tip for the teacher>"
}`;
}

function buildPlannerSystemPrompt(style: "SIMPLE" | "DEEP" | "BALANCED"): string {
    const s = TEACHING_STYLE_BRIEFS[style];
    return [
        "You are an expert primary/secondary school curriculum and lesson planner.",
        `Teaching style: ${s.name}.`,
        s.brief,
        "Pedagogical guidelines:",
        s.guidelines,
        "Always respond with VALID JSON only. No markdown, no commentary.",
    ].join("\n");
}

export const plannerRouter = createTRPCRouter({
    // Get all teaching plans
    getAllPlans: publicProcedure
        .input(
            z.object({
                classId: z.string().optional(),
                status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "PAUSED"]).optional(),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            const where: any = {};
            if (input?.classId) where.classId = input.classId;
            if (input?.status) where.status = input.status;

            return ctx.db.teachingPlan.findMany({
                where,
                include: {
                    file: {
                        select: { id: true, name: true },
                    },
                    class: {
                        select: { id: true, name: true, section: true },
                    },
                    dailyPlans: {
                        orderBy: { dayNumber: "asc" },
                    },
                    _count: {
                        select: { dailyPlans: true },
                    },
                },
                orderBy: { createdAt: "desc" },
            });
        }),

    // Get a specific plan with all details
    getPlan: publicProcedure
        .input(z.object({ planId: z.string() }))
        .query(async ({ ctx, input }) => {
            const plan = await ctx.db.teachingPlan.findUnique({
                where: { id: input.planId },
                include: {
                    file: {
                        include: {
                            chapters: {
                                include: { topics: true },
                                orderBy: { chapterNumber: "asc" },
                            },
                        },
                    },
                    class: true,
                    dailyPlans: {
                        orderBy: { dayNumber: "asc" },
                    },
                },
            });

            if (!plan) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Teaching plan not found",
                });
            }

            return plan;
        }),

    // Get files with chapters (for plan creation)
    getFilesWithChapters: publicProcedure.query(async ({ ctx }) => {
        return ctx.db.file.findMany({
            where: {
                uploadStatus: "SUCCESS",
                chapters: {
                    some: {},
                },
            },
            select: {
                id: true,
                name: true,
                chapters: {
                    select: {
                        id: true,
                        chapterNumber: true,
                        title: true,
                        topics: {
                            select: {
                                id: true,
                                topicNumber: true,
                                title: true,
                                estimatedTime: true,
                            },
                            orderBy: { topicNumber: "asc" },
                        },
                    },
                    orderBy: { chapterNumber: "asc" },
                },
            },
            orderBy: { name: "asc" },
        });
    }),

    // Create a new teaching plan with AI-generated breakdown
    createPlan: publicProcedure
        .input(
            z.object({
                name: z.string().min(1, "Plan name is required"),
                fileId: z.string(),
                classId: z.string().optional(),
                startDate: z.string(), // ISO date string
                endDate: z.string(),
                chaptersTocover: z.array(z.number()).min(1, "Select at least one chapter"),
                notes: z.string().optional(),
                teachingStyle: z.enum(["SIMPLE", "DEEP", "BALANCED"]).default("BALANCED"),
                gradeLevel: z.string().optional(),
                subject: z.string().optional(),
                board: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Calculate total working days (excluding weekends)
            const start = new Date(input.startDate);
            const end = new Date(input.endDate);
            let totalDays = 0;
            const current = new Date(start);

            while (current <= end) {
                const day = current.getDay();
                if (day !== 0 && day !== 6) {
                    // Skip Sunday (0) and Saturday (6)
                    totalDays++;
                }
                current.setDate(current.getDate() + 1);
            }

            if (totalDays < 1) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Please select a valid date range with at least 1 working day",
                });
            }

            // Get chapters and topics from the file
            const file = await ctx.db.file.findUnique({
                where: { id: input.fileId },
                include: {
                    chapters: {
                        where: {
                            chapterNumber: { in: input.chaptersTocover },
                        },
                        include: { topics: true },
                        orderBy: { chapterNumber: "asc" },
                    },
                },
            });

            if (!file) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "File not found",
                });
            }

            if (file.chapters.length === 0) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Selected file has no chapters to cover",
                });
            }

            // Create the teaching plan
            const plan = await ctx.db.teachingPlan.create({
                data: {
                    name: input.name,
                    fileId: input.fileId,
                    classId: input.classId || null,
                    startDate: start,
                    endDate: end,
                    totalDays,
                    chaptersTocover: input.chaptersTocover,
                    status: "DRAFT",
                    notes: input.notes,
                    teachingStyle: input.teachingStyle,
                    gradeLevel: input.gradeLevel,
                    subject: input.subject,
                    board: input.board,
                },
            });

            return plan;
        }),

    // Generate AI-powered daily plan breakdown
    generateAIPlan: publicProcedure
        .input(z.object({ planId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const plan = await ctx.db.teachingPlan.findUnique({
                where: { id: input.planId },
                include: {
                    file: {
                        include: {
                            chapters: {
                                where: {
                                    chapterNumber: { in: [] }, // Will be populated
                                },
                                include: { topics: true },
                                orderBy: { chapterNumber: "asc" },
                            },
                        },
                    },
                    class: true,
                },
            });

            if (!plan) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Plan not found",
                });
            }

            // Get chapters properly
            const chapters = await ctx.db.chapter.findMany({
                where: {
                    fileId: plan.fileId,
                    chapterNumber: { in: plan.chaptersTocover },
                },
                include: { topics: true },
                orderBy: { chapterNumber: "asc" },
            });

            // Get relevant content from Pinecone for each chapter
            const embeddings = new OpenAIEmbeddings({
                openAIApiKey: process.env.OPENAI_API_KEY,
            });

            const pinecone = await getPineconeClient();
            const pineconeIndex = pinecone.Index("sana-ai");

            let contextContent = "";

            for (const chapter of chapters) {
                const queryText = `Chapter ${chapter.chapterNumber}: ${chapter.title}`;
                const queryEmbedding = await embeddings.embedQuery(queryText);

                const results = await pineconeIndex.namespace(plan.fileId).query({
                    vector: queryEmbedding,
                    topK: 5,
                    includeMetadata: true,
                    filter: { chapterNumber: chapter.chapterNumber },
                });

                const chapterContext = results.matches
                    ?.map((m) => m.metadata?.text)
                    .filter(Boolean)
                    .join("\n");

                contextContent += `\n\n=== Chapter ${chapter.chapterNumber}: ${chapter.title} ===\n`;
                contextContent += chapter.topics
                    .map((t) => `- Topic ${t.topicNumber}: ${t.title} (${t.estimatedTime} mins)`)
                    .join("\n");
                contextContent += `\n\nContent Preview:\n${chapterContext || chapter.content?.substring(0, 1000) || "No content available"}`;
            }

            // Generate AI plan — style-aware lesson plans
            const style = (plan.teachingStyle ?? "BALANCED") as
                | "SIMPLE"
                | "DEEP"
                | "BALANCED";
            const styleBrief = TEACHING_STYLE_BRIEFS[style];
            const schemaSpec = buildLessonPlanSchemaSpec();

            const audienceLine = [
                plan.gradeLevel ? `Grade level: ${plan.gradeLevel}` : null,
                plan.subject ? `Subject: ${plan.subject}` : null,
                plan.board ? `Board/Curriculum: ${plan.board}` : null,
            ]
                .filter(Boolean)
                .join("\n");

            const prompt = `You are creating a complete day-by-day LESSON PLAN series for a teacher.

TEACHING STYLE: ${styleBrief.name}
${styleBrief.brief}

STYLE GUIDELINES:
${styleBrief.guidelines}

${audienceLine ? `AUDIENCE:\n${audienceLine}\n` : ""}
COURSE CONTENT (from the teacher's uploaded book):
${contextContent}

CONSTRAINTS:
- Total teaching days available: ${plan.totalDays}
- Chapters to cover: ${chapters.map((c) => `Chapter ${c.chapterNumber}: ${c.title}`).join(", ")}
- Start date: ${plan.startDate.toISOString().split("T")[0]}
${plan.notes ? `- Teacher notes: ${plan.notes}` : ""}

REQUIREMENTS:
1. Distribute content logically across ${plan.totalDays} days, prerequisites first.
2. Each day MUST be a complete, ready-to-teach lesson plan.
3. Use ONLY content grounded in the course material above.
4. Keep daily workload balanced (one focused lesson per day).
5. Match the chosen TEACHING STYLE in tone, depth and question types.

OUTPUT FORMAT:
Respond with a JSON object of the shape:
{ "days": [ <day object>, <day object>, ... ] }

${schemaSpec}

Return ONLY the JSON object. No prose, no markdown fences.`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: buildPlannerSystemPrompt(style),
                    },
                    { role: "user", content: prompt },
                ],
                temperature: 0.7,
                max_tokens: 6000,
                response_format: { type: "json_object" },
            });

            const responseText = completion.choices[0]?.message?.content || "{}";

            let parsed: any;
            let days: any[];
            try {
                const cleaned = responseText
                    .replace(/```json\n?/g, "")
                    .replace(/```\n?/g, "")
                    .trim();
                parsed = JSON.parse(cleaned);
                days = Array.isArray(parsed)
                    ? parsed
                    : Array.isArray(parsed?.days)
                        ? parsed.days
                        : [];
                if (!Array.isArray(days) || days.length === 0) {
                    throw new Error("AI response contained no days");
                }
            } catch (e) {
                console.error("Failed to parse AI response:", responseText);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to generate teaching plan. Please try again.",
                });
            }

            // Delete existing daily plans
            await ctx.db.dailyPlan.deleteMany({
                where: { teachingPlanId: plan.id },
            });

            // Create daily plans from AI response
            const startDate = new Date(plan.startDate);
            let currentDate = new Date(startDate);

            for (const day of days) {
                // Skip weekends
                while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
                    currentDate.setDate(currentDate.getDate() + 1);
                }

                const topics = Array.isArray(day.topicsTocover) ? day.topicsTocover : [];
                const topicName = day.topicName as string | undefined;
                const finalTopics = topics.length > 0
                    ? topics
                    : topicName
                        ? [topicName]
                        : [];

                await ctx.db.dailyPlan.create({
                    data: {
                        teachingPlanId: plan.id,
                        dayNumber: day.dayNumber,
                        date: new Date(currentDate),
                        chapterNumber: day.chapterNumber,
                        topicsTocover: finalTopics,
                        objectives: Array.isArray(day.objectives) ? day.objectives : [],
                        activities: Array.isArray(day.activities) ? day.activities : [],
                        estimatedTime: day.estimatedTime || 45,
                        teacherNotes: day.teachingTips || null,
                        prerequisites: Array.isArray(day.prerequisites) ? day.prerequisites : [],
                        explanation: day.explanation || null,
                        conceptInsight: day.conceptInsight || null,
                        workedExamples: Array.isArray(day.workedExamples)
                            ? day.workedExamples
                            : null,
                        practiceQuestions: Array.isArray(day.practiceQuestions)
                            ? day.practiceQuestions
                            : [],
                        quickTest: Array.isArray(day.quickTest) ? day.quickTest : [],
                        realLifeApplication: Array.isArray(day.realLifeApplication)
                            ? day.realLifeApplication
                            : [],
                        finalOutcome: day.finalOutcome || null,
                    },
                });

                currentDate.setDate(currentDate.getDate() + 1);
            }

            // Update plan with AI generated content
            await ctx.db.teachingPlan.update({
                where: { id: plan.id },
                data: {
                    aiGeneratedPlan: parsed,
                    status: "DRAFT",
                },
            });

            return { success: true, daysGenerated: days.length };
        }),

    // Update plan status
    updatePlanStatus: publicProcedure
        .input(
            z.object({
                planId: z.string(),
                status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "PAUSED"]),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.db.teachingPlan.update({
                where: { id: input.planId },
                data: { status: input.status },
            });
        }),

    // Mark a daily plan as completed
    markDayCompleted: publicProcedure
        .input(
            z.object({
                dailyPlanId: z.string(),
                isCompleted: z.boolean(),
                notes: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.db.dailyPlan.update({
                where: { id: input.dailyPlanId },
                data: {
                    isCompleted: input.isCompleted,
                    completedAt: input.isCompleted ? new Date() : null,
                    teacherNotes: input.notes,
                },
            });
        }),

    // Update a daily plan
    updateDailyPlan: publicProcedure
        .input(
            z.object({
                dailyPlanId: z.string(),
                topicsTocover: z.array(z.string()).optional(),
                objectives: z.array(z.string()).optional(),
                activities: z.array(z.string()).optional(),
                estimatedTime: z.number().optional(),
                teacherNotes: z.string().optional(),
                prerequisites: z.array(z.string()).optional(),
                explanation: z.string().optional(),
                conceptInsight: z.string().optional(),
                practiceQuestions: z.array(z.string()).optional(),
                quickTest: z.array(z.string()).optional(),
                realLifeApplication: z.array(z.string()).optional(),
                finalOutcome: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { dailyPlanId, ...updateData } = input;
            return ctx.db.dailyPlan.update({
                where: { id: dailyPlanId },
                data: updateData,
            });
        }),

    // Update plan-level metadata (style, grade, subject)
    updatePlanMetadata: publicProcedure
        .input(
            z.object({
                planId: z.string(),
                teachingStyle: z.enum(["SIMPLE", "DEEP", "BALANCED"]).optional(),
                gradeLevel: z.string().optional(),
                subject: z.string().optional(),
                board: z.string().optional(),
                notes: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { planId, ...data } = input;
            return ctx.db.teachingPlan.update({
                where: { id: planId },
                data,
            });
        }),

    // Regenerate the FULL lesson plan for a single day (style-aware).
    // Useful when a teacher wants to deepen or simplify just one lesson.
    regenerateDailyPlan: publicProcedure
        .input(
            z.object({
                dailyPlanId: z.string(),
                styleOverride: z.enum(["SIMPLE", "DEEP", "BALANCED"]).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const dailyPlan = await ctx.db.dailyPlan.findUnique({
                where: { id: input.dailyPlanId },
                include: {
                    teachingPlan: {
                        include: { file: true },
                    },
                },
            });
            if (!dailyPlan) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Daily plan not found" });
            }
            const plan = dailyPlan.teachingPlan;
            const style = (input.styleOverride ?? plan.teachingStyle ?? "BALANCED") as
                | "SIMPLE"
                | "DEEP"
                | "BALANCED";

            // Pull tightly-scoped context for this day's topics
            const embeddings = new OpenAIEmbeddings({
                openAIApiKey: process.env.OPENAI_API_KEY,
            });
            const pinecone = await getPineconeClient();
            const pineconeIndex = pinecone.Index("sana-ai");

            const queryText = `Chapter ${dailyPlan.chapterNumber}: ${dailyPlan.topicsTocover.join(", ")}`;
            const queryEmbedding = await embeddings.embedQuery(queryText);
            const results = await pineconeIndex.namespace(plan.fileId).query({
                vector: queryEmbedding,
                topK: 8,
                includeMetadata: true,
                filter: { chapterNumber: dailyPlan.chapterNumber },
            });
            const context = results.matches
                ?.map((m) => m.metadata?.text)
                .filter(Boolean)
                .join("\n\n") || "";

            const styleBrief = TEACHING_STYLE_BRIEFS[style];
            const schemaSpec = buildLessonPlanSchemaSpec();
            const audienceLine = [
                plan.gradeLevel ? `Grade level: ${plan.gradeLevel}` : null,
                plan.subject ? `Subject: ${plan.subject}` : null,
                plan.board ? `Board/Curriculum: ${plan.board}` : null,
            ]
                .filter(Boolean)
                .join("\n");

            const prompt = `Create ONE complete lesson plan for the following topic.

TEACHING STYLE: ${styleBrief.name}
${styleBrief.brief}

STYLE GUIDELINES:
${styleBrief.guidelines}

${audienceLine ? `AUDIENCE:\n${audienceLine}\n` : ""}
LESSON CONTEXT:
- Chapter: ${dailyPlan.chapterNumber}
- Topics: ${dailyPlan.topicsTocover.join(", ") || "(infer from content)"}
- Day number in plan: ${dailyPlan.dayNumber}

COURSE CONTENT:
${context}

OUTPUT:
Return ONE JSON object that matches this schema (no array, no markdown):
${schemaSpec}`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: buildPlannerSystemPrompt(style) },
                    { role: "user", content: prompt },
                ],
                temperature: 0.7,
                max_tokens: 2500,
                response_format: { type: "json_object" },
            });

            const responseText = completion.choices[0]?.message?.content || "{}";
            let day: any;
            try {
                day = JSON.parse(
                    responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
                );
            } catch (e) {
                console.error("Failed to parse AI lesson:", responseText);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to regenerate lesson. Please try again.",
                });
            }

            const topics = Array.isArray(day.topicsTocover) ? day.topicsTocover : [];
            const finalTopics = topics.length > 0
                ? topics
                : day.topicName
                    ? [day.topicName]
                    : dailyPlan.topicsTocover;

            return ctx.db.dailyPlan.update({
                where: { id: dailyPlan.id },
                data: {
                    topicsTocover: finalTopics,
                    objectives: Array.isArray(day.objectives) ? day.objectives : [],
                    activities: Array.isArray(day.activities) ? day.activities : [],
                    estimatedTime: day.estimatedTime || dailyPlan.estimatedTime,
                    teacherNotes: day.teachingTips || dailyPlan.teacherNotes,
                    prerequisites: Array.isArray(day.prerequisites) ? day.prerequisites : [],
                    explanation: day.explanation || null,
                    conceptInsight: day.conceptInsight || null,
                    workedExamples: Array.isArray(day.workedExamples) ? day.workedExamples : null,
                    practiceQuestions: Array.isArray(day.practiceQuestions)
                        ? day.practiceQuestions
                        : [],
                    quickTest: Array.isArray(day.quickTest) ? day.quickTest : [],
                    realLifeApplication: Array.isArray(day.realLifeApplication)
                        ? day.realLifeApplication
                        : [],
                    finalOutcome: day.finalOutcome || null,
                },
            });
        }),

    // Delete a teaching plan
    deletePlan: publicProcedure
        .input(z.object({ planId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.teachingPlan.delete({
                where: { id: input.planId },
            });
            return { success: true };
        }),

    // Get AI suggestions for a specific day/topic
    getAISuggestions: publicProcedure
        .input(
            z.object({
                planId: z.string(),
                dayNumber: z.number(),
                question: z.string(), // e.g., "How should I explain this concept?" or "What examples can I use?"
            })
        )
        .mutation(async ({ ctx, input }) => {
            const plan = await ctx.db.teachingPlan.findUnique({
                where: { id: input.planId },
                include: {
                    dailyPlans: {
                        where: { dayNumber: input.dayNumber },
                    },
                    file: true,
                },
            });

            if (!plan || plan.dailyPlans.length === 0) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Plan or daily plan not found",
                });
            }

            const dailyPlan = plan.dailyPlans[0];

            // Get relevant content from Pinecone
            const embeddings = new OpenAIEmbeddings({
                openAIApiKey: process.env.OPENAI_API_KEY,
            });

            const pinecone = await getPineconeClient();
            const pineconeIndex = pinecone.Index("sana-ai");

            const queryText = `${dailyPlan.topicsTocover.join(" ")} ${input.question}`;
            const queryEmbedding = await embeddings.embedQuery(queryText);

            const results = await pineconeIndex.namespace(plan.fileId).query({
                vector: queryEmbedding,
                topK: 8,
                includeMetadata: true,
            });

            const context = results.matches
                ?.map((m) => m.metadata?.text)
                .filter(Boolean)
                .join("\n\n");

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are an expert teaching assistant helping teachers plan their lessons. 
                        Use the provided course content to give specific, actionable suggestions.
                        Be practical and consider classroom dynamics.`,
                    },
                    {
                        role: "user",
                        content: `COURSE CONTENT:
${context}

DAY PLAN:
- Topics: ${dailyPlan.topicsTocover.join(", ")}
- Objectives: ${dailyPlan.objectives.join(", ")}
- Activities: ${dailyPlan.activities.join(", ")}

TEACHER'S QUESTION: ${input.question}

Provide specific, helpful suggestions based on the actual course content.`,
                    },
                ],
                temperature: 0.7,
                max_tokens: 1000,
            });

            return {
                suggestion: completion.choices[0]?.message?.content || "No suggestion available",
            };
        }),
});
