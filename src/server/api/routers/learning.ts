import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { generateChapterQuiz as generateQuiz } from "@/lib/quiz-generator";

export const learningRouter = createTRPCRouter({
    getLearningState: publicProcedure
        .input(
            z.object({
                fileId: z.string(),
                sessionKey: z.string(),
            })
        )
        .query(async ({ ctx, input }) => {
            console.log("🔍 getLearningState called:", input);

            let state = await ctx.db.learningState.findUnique({
                where: { sessionKey: input.sessionKey },
            });

            console.log("📊 Found state:", state);

            if (!state) {
                // Attempt recovery from StudentProgress
                const progress = await ctx.db.studentProgress.findFirst({
                    where: { fileId: input.fileId },
                });

                console.log(
                    "🆕 Creating new learning state",
                    progress ? "(Recovered)" : "(Fresh)"
                );

                state = await ctx.db.learningState.create({
                    data: {
                        fileId: input.fileId,
                        sessionKey: input.sessionKey,
                        currentChapter: progress?.currentChapter ?? 1,
                        currentTopic: progress?.currentTopic ?? 1,
                        learningPhase: progress ? "learning" : "introduction",
                        messageCount: 0,
                        chaptersCompleted: progress?.completedTopics ? [] : [],
                    },
                });
                console.log("✅ Created state:", state);
            }

            return state;
        }),

    generateChapterQuiz: publicProcedure
        .input(
            z.object({
                fileId: z.string(),
                chapterNumber: z.number(),
                retry: z.boolean().optional(),
            })
        )
        .query(async ({ ctx, input }) => {
            const { fileId, chapterNumber } = input;

            console.log(
                `📝 [tRPC] Checking for existing quiz: Chapter ${chapterNumber}`
            );

            // Check if quiz already exists
            if (!input.retry) {
                const existingQuiz = await ctx.db.quizQuestion.findMany({
                    where: { fileId, chapterNumber },
                    take: 10,
                });

                if (existingQuiz.length >= 10) {
                    console.log(
                        `✅ [tRPC] Found ${existingQuiz.length} existing questions`
                    );
                    return existingQuiz;
                }
            }

            console.log(`🔨 [tRPC] No existing quiz found, generating new one...`);

            // Get chapter content
            const chapter = await ctx.db.chapter.findFirst({
                where: { fileId, chapterNumber },
                include: { topics: true },
            });

            if (!chapter) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Chapter not found",
                });
            }

            // Generate quiz with AI
            const topics = chapter.topics.map((t) => t.title);

            try {
                const newQuestions = await generateQuiz({
                    fileId,
                    chapterNumber,
                    chapterContent: chapter.content,
                    chapterTitle: chapter.title,
                    topics,
                    count: 10,
                });

                console.log(
                    `✅ [tRPC] Successfully generated ${newQuestions.length} questions`
                );
                return newQuestions;
            } catch (error) {
                console.error("❌ [tRPC] Quiz generation failed:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to generate quiz questions",
                });
            }
        }),

    submitQuizAnswers: publicProcedure
        .input(
            z.object({
                fileId: z.string(),
                chapterNumber: z.number(),
                sessionKey: z.string(),
                answers: z.array(
                    z.object({
                        questionId: z.string(),
                        selectedAnswer: z.string(),
                    })
                ),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { fileId, chapterNumber, sessionKey, answers } = input;

            const questions = await ctx.db.quizQuestion.findMany({
                where: {
                    fileId,
                    chapterNumber,
                    id: { in: answers.map((a) => a.questionId) },
                },
            });

            const gradedAnswers = answers.map((answer) => {
                const question = questions.find((q) => q.id === answer.questionId);
                const isCorrect = question?.correctAnswer === answer.selectedAnswer;

                return {
                    questionId: answer.questionId,
                    selectedAnswer: answer.selectedAnswer,
                    correctAnswer: question?.correctAnswer,
                    isCorrect,
                    topicCovered: question?.topicCovered,
                };
            });

            const score = gradedAnswers.filter((a) => a.isCorrect).length;
            // STRICT GATEKEEPING: Must score 6/10 to pass
            const passed = score >= 6;

            const weakTopics = gradedAnswers
                .filter((a) => !a.isCorrect)
                .map((a) => a.topicCovered)
                .filter(
                    (topic, index, self) => topic && self.indexOf(topic) === index
                ) as string[];

            const attempt = await ctx.db.quizAttempt.create({
                data: {
                    fileId,
                    chapterNumber,
                    sessionKey,
                    score,
                    totalQuestions: answers.length,
                    answers: gradedAnswers,
                    weakTopics,
                    passed,
                },
            });

            if (passed) {
                // Unlock next chapter
                await ctx.db.learningState.update({
                    where: { sessionKey },
                    data: {
                        chaptersCompleted: { push: chapterNumber }, // Append to array
                        quizzesPassed: { push: chapterNumber },
                        currentChapter: chapterNumber + 1,
                        currentTopic: 1,
                        learningPhase: "introduction",
                        needsReview: false,
                        messageCount: 0,
                    },
                });

                // Also sync StudentProgress for persistence
                await ctx.db.studentProgress.updateMany({
                    where: { fileId },
                    data: {
                        currentChapter: chapterNumber + 1,
                        currentTopic: 1,
                    },
                });
            } else {
                // Block progress, force review
                await ctx.db.learningState.update({
                    where: { sessionKey },
                    data: {
                        learningPhase: "review",
                        needsReview: true,
                        reviewTopics: weakTopics,
                    },
                });
            }

            return {
                score,
                totalQuestions: answers.length,
                passed,
                weakTopics,
                gradedAnswers,
                attempt,
            };
        }),

    updateLearningPhase: publicProcedure
        .input(
            z.object({
                sessionKey: z.string(),
                phase: z.string(),
                incrementMessageCount: z.boolean().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const updateData: any = {
                learningPhase: input.phase,
                lastInteraction: new Date(),
            };

            if (input.incrementMessageCount) {
                const state = await ctx.db.learningState.findUnique({
                    where: { sessionKey: input.sessionKey },
                });
                updateData.messageCount = (state?.messageCount || 0) + 1;
            }

            return await ctx.db.learningState.update({
                where: { sessionKey: input.sessionKey },
                data: updateData,
            });
        }),

    completeTopic: publicProcedure
        .input(
            z.object({
                fileId: z.string(),
                sessionKey: z.string(),
                chapterNumber: z.number(),
                topicNumber: z.number(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { fileId, sessionKey, chapterNumber, topicNumber } = input;
            const topicIdentifier = `${chapterNumber}.${topicNumber}`;

            // 1. Update StudentProgress (Analytics)
            const progress = await ctx.db.studentProgress.findUnique({
                where: { fileId },
            });

            if (progress) {
                const completedTopics = new Set(progress.completedTopics);
                completedTopics.add(topicIdentifier);

                const nextTopic = topicNumber + 1;

                await ctx.db.studentProgress.update({
                    where: { fileId },
                    data: {
                        completedTopics: Array.from(completedTopics),
                        lastInteraction: new Date(),
                        // Sync pointer
                        currentChapter: chapterNumber,
                        currentTopic: nextTopic,
                    },
                });
            } else {
                await ctx.db.studentProgress.create({
                    data: {
                        fileId,
                        completedTopics: [topicIdentifier],
                        currentChapter: chapterNumber,
                        currentTopic: topicNumber + 1,
                    },
                });
            }

            // Check if this was the last topic of the chapter
            const chapter = await ctx.db.chapter.findFirst({
                where: { fileId, chapterNumber },
                include: { topics: true },
            });

            if (chapter) {
                const totalTopics = chapter.topics.length;

                // Only trigger quiz if:
                // 1. It is the last topic
                // 2. The chapter actually HAS topics (avoid weird states)
                if (totalTopics > 0 && topicNumber >= totalTopics) {
                    // It's the last topic! Trigger quiz phase
                    await ctx.db.learningState.update({
                        where: { sessionKey },
                        data: {
                            learningPhase: "quiz-ready",
                            messageCount: 0,
                            lastInteraction: new Date(),
                        },
                    });
                    return { success: true, quizReady: true };
                }
            }

            // 2. Update LearningState (Session) - Move to next topic
            await ctx.db.learningState.update({
                where: { sessionKey },
                data: {
                    currentTopic: topicNumber + 1,
                    messageCount: 0,
                    lastInteraction: new Date(),
                },
            });

            return { success: true, quizReady: false };
        }),
});
