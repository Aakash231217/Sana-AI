import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { OpenAI } from "openai";
import { getPineconeClient } from "@/lib/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

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

            // Generate AI plan
            const prompt = `You are an expert educational planner. Based on the following course content, create a detailed day-by-day teaching plan.

COURSE CONTENT:
${contextContent}

CONSTRAINTS:
- Total teaching days available: ${plan.totalDays}
- Chapters to cover: ${chapters.map((c) => `Chapter ${c.chapterNumber}: ${c.title}`).join(", ")}
- Start date: ${plan.startDate.toISOString().split("T")[0]}

REQUIREMENTS:
1. Distribute content logically across ${plan.totalDays} days
2. Each day should have clear learning objectives
3. Include suggested activities (discussions, exercises, examples)
4. Consider topic dependencies - teach prerequisites first
5. Allow time for review and practice
6. Keep daily workload balanced

Respond with a JSON array where each element represents one day:
[
  {
    "dayNumber": 1,
    "chapterNumber": 1,
    "topicsTocover": ["Topic title 1", "Topic title 2"],
    "objectives": ["Students will understand X", "Students will be able to Y"],
    "activities": ["Introduction lecture", "Group discussion on concept A", "Practice problems"],
    "estimatedTime": 45,
    "teachingTips": "Start with a real-world example to engage students"
  }
]

Return ONLY the JSON array, no other text.`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content:
                            "You are an expert curriculum planner. Generate practical, detailed teaching plans based on actual course content. Always respond with valid JSON.",
                    },
                    { role: "user", content: prompt },
                ],
                temperature: 0.7,
                max_tokens: 4000,
            });

            const responseText = completion.choices[0]?.message?.content || "[]";

            let aiPlan;
            try {
                // Clean the response - remove markdown code blocks if present
                const cleanedResponse = responseText
                    .replace(/```json\n?/g, "")
                    .replace(/```\n?/g, "")
                    .trim();
                aiPlan = JSON.parse(cleanedResponse);
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

            for (const day of aiPlan) {
                // Skip weekends
                while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
                    currentDate.setDate(currentDate.getDate() + 1);
                }

                await ctx.db.dailyPlan.create({
                    data: {
                        teachingPlanId: plan.id,
                        dayNumber: day.dayNumber,
                        date: new Date(currentDate),
                        chapterNumber: day.chapterNumber,
                        topicsTocover: day.topicsTocover || [],
                        objectives: day.objectives || [],
                        activities: day.activities || [],
                        estimatedTime: day.estimatedTime || 45,
                        teacherNotes: day.teachingTips || null,
                    },
                });

                currentDate.setDate(currentDate.getDate() + 1);
            }

            // Update plan with AI generated content
            await ctx.db.teachingPlan.update({
                where: { id: plan.id },
                data: {
                    aiGeneratedPlan: aiPlan,
                    status: "DRAFT",
                },
            });

            return { success: true, daysGenerated: aiPlan.length };
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
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { dailyPlanId, ...updateData } = input;
            return ctx.db.dailyPlan.update({
                where: { id: dailyPlanId },
                data: updateData,
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
