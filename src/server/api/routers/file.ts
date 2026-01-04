import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { INFINITE_QUERY_LIMIT } from "@/config/infinite-query";
import { ChapterExtractor } from "@/lib/chapter-extractor";

export const fileRouter = createTRPCRouter({
    getUserFiles: publicProcedure
        .input(
            z
                .object({
                    subjectId: z.string().nullable().optional(),
                    subfolderId: z.string().nullable().optional(),
                })
                .optional()
        )
        .query(async ({ ctx, input }) => {
            const whereClause: any = {};

            if (input?.subjectId !== undefined) {
                whereClause.subjectId = input.subjectId;
            }

            if (input?.subfolderId !== undefined) {
                whereClause.subfolderId = input.subfolderId;
            }

            return await ctx.db.file.findMany({
                where: whereClause,
                orderBy: {
                    createdAt: "desc",
                },
            });
        }),

    getFile: publicProcedure
        .input(z.object({ key: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const file = await ctx.db.file.findFirst({
                where: {
                    key: input.key,
                },
            });

            if (!file) throw new TRPCError({ code: "NOT_FOUND" });

            return file;
        }),

    deleteFile: publicProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const file = await ctx.db.file.findFirst({
                where: {
                    id: input.id,
                },
            });

            if (!file) throw new TRPCError({ code: "NOT_FOUND" });

            await ctx.db.file.delete({
                where: {
                    id: input.id,
                },
            });

            return file;
        }),

    getFileUploadStatus: publicProcedure
        .input(z.object({ fileId: z.string() }))
        .query(async ({ ctx, input }) => {
            const file = await ctx.db.file.findFirst({
                where: {
                    id: input.fileId,
                },
            });

            if (!file) return { status: "PENDING" as const };

            return { status: file.uploadStatus };
        }),

    getFileMessages: publicProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).nullish(),
                cursor: z.string().nullish(),
                fileId: z.string(),
            })
        )
        .query(async ({ ctx, input }) => {
            const { fileId, cursor } = input;
            const limit = input.limit ?? INFINITE_QUERY_LIMIT;

            const file = await ctx.db.file.findFirst({
                where: {
                    id: fileId,
                },
            });

            if (!file) throw new TRPCError({ code: "NOT_FOUND" });

            const messages = await ctx.db.message.findMany({
                take: limit + 1,
                where: {
                    fileId,
                },
                orderBy: {
                    createdAt: "desc",
                },
                cursor: cursor ? { id: cursor } : undefined,
                select: {
                    id: true,
                    isUserMessage: true,
                    createdAt: true,
                    text: true,
                },
            });

            let nextCursor: typeof cursor | undefined = undefined;
            if (messages.length > limit) {
                const nextItem = messages.pop();
                nextCursor = nextItem?.id;
            }

            return {
                messages,
                nextCursor,
            };
        }),

    submitMessageFeedback: publicProcedure
        .input(
            z.object({
                messageId: z.string(),
                feedbackType: z.enum(["THUMBS_UP", "THUMBS_DOWN"]),
                feedbackReason: z.string().optional(),
                feedbackCategory: z
                    .enum([
                        "TOO_COMPLEX",
                        "INCORRECT_INFO",
                        "MISSING_CONTEXT",
                        "OFF_TOPIC",
                        "OTHER",
                    ])
                    .optional(),
                correctedResponse: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const message = await ctx.db.message.findUnique({
                where: { id: input.messageId },
            });

            if (!message) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Message not found",
                });
            }

            const existingFeedback = await ctx.db.messageFeedback.findUnique({
                where: { messageId: input.messageId },
            });

            if (existingFeedback) {
                const updatedFeedback = await ctx.db.messageFeedback.update({
                    where: { messageId: input.messageId },
                    data: {
                        feedbackType: input.feedbackType,
                        feedbackReason: input.feedbackReason,
                        feedbackCategory: input.feedbackCategory,
                        correctedResponse: input.correctedResponse,
                        updatedAt: new Date(),
                    },
                });

                return updatedFeedback;
            }

            const feedback = await ctx.db.messageFeedback.create({
                data: {
                    messageId: input.messageId,
                    fileId: message.fileId!,
                    feedbackType: input.feedbackType,
                    feedbackReason: input.feedbackReason,
                    feedbackCategory: input.feedbackCategory,
                    correctedResponse: input.correctedResponse,
                },
            });

            return feedback;
        }),

    updateMessageFeedback: publicProcedure
        .input(
            z.object({
                feedbackId: z.string(),
                correctedResponse: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const feedback = await ctx.db.messageFeedback.findUnique({
                where: { id: input.feedbackId },
            });

            if (!feedback) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Feedback not found",
                });
            }

            const updated = await ctx.db.messageFeedback.update({
                where: { id: input.feedbackId },
                data: {
                    correctedResponse: input.correctedResponse,
                    updatedAt: new Date(),
                },
            });

            return updated;
        }),

    getFileAnalytics: publicProcedure
        .input(z.object({ fileId: z.string() }))
        .query(async ({ ctx, input }) => {
            const { fileId } = input;

            const file = await ctx.db.file.findFirst({
                where: { id: fileId },
            });

            if (!file) throw new TRPCError({ code: "NOT_FOUND" });

            const messages = await ctx.db.message.findMany({
                where: { fileId },
                orderBy: { createdAt: "desc" },
            });

            const feedback = await ctx.db.messageFeedback.findMany({
                where: { fileId },
                include: {
                    Message: true,
                },
                orderBy: { createdAt: "desc" },
            });

            const feedbackWithContext = await Promise.all(
                feedback.map(async (fb) => {
                    const userMessage = await ctx.db.message.findFirst({
                        where: {
                            fileId,
                            isUserMessage: true,
                            createdAt: {
                                lt: fb.Message.createdAt,
                            },
                        },
                        orderBy: {
                            createdAt: "desc",
                        },
                    });

                    return {
                        ...fb,
                        userQuestion: userMessage?.text || "Question not found",
                    };
                })
            );

            const progress = await ctx.db.studentProgress.findUnique({
                where: { fileId },
            });

            const chapters = await ctx.db.chapter.findMany({
                where: { fileId },
                include: {
                    topics: true,
                },
                orderBy: {
                    chapterNumber: "asc",
                },
            });

            const totalMessages = messages.length;
            const userMessages = messages.filter((m) => m.isUserMessage).length;
            const aiMessages = messages.filter((m) => !m.isUserMessage).length;
            const thumbsUp = feedback.filter((f) => f.feedbackType === "THUMBS_UP").length;
            const thumbsDown = feedback.filter((f) => f.feedbackType === "THUMBS_DOWN").length;
            const completedChapters = progress?.completedChapters || 0;
            const totalChapters = chapters.length;

            return {
                file,
                messages,
                feedbackWithContext,
                progress,
                chapters,
                totalMessages,
                userMessages,
                aiMessages,
                thumbsUp,
                thumbsDown,
                completedChapters,
                totalChapters,
            };
        }),

    extractChapters: publicProcedure
        .input(z.object({ fileId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const file = await ctx.db.file.findFirst({
                where: { id: input.fileId },
                include: { chapters: true },
            });

            if (!file) throw new TRPCError({ code: "NOT_FOUND" });

            if (file.chapters.length > 0) {
                return file.chapters;
            }

            const response = await fetch(file.url);
            if (!response.ok) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to download PDF",
                });
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            const extractor = new ChapterExtractor();
            const { chapters, fullText } = await extractor.extractChaptersFromPDF(
                buffer
            );

            const savedChapters = await Promise.all(
                chapters.map(async (chapter) => {
                    const content = extractor.extractChapterContent(fullText, chapter);
                    const topics = extractor.identifyTopics(content);

                    const savedChapter = await ctx.db.chapter.create({
                        data: {
                            fileId: file.id,
                            chapterNumber: chapter.chapterNumber,
                            title: chapter.title,
                            content: content,
                            startPage: chapter.startPage,
                            endPage: chapter.endPage,
                            topics: {
                                create: topics.map((topic) => ({
                                    topicNumber: topic.topicNumber,
                                    title: topic.title,
                                    content: topic.content,
                                    estimatedTime: topic.estimatedTime,
                                })),
                            },
                        },
                        include: { topics: true },
                    });

                    return savedChapter;
                })
            );

            return savedChapters;
        }),

    getChapters: publicProcedure
        .input(z.object({ fileId: z.string() }))
        .query(async ({ ctx, input }) => {
            const chapters = await ctx.db.chapter.findMany({
                where: { fileId: input.fileId },
                include: { topics: true },
                orderBy: { chapterNumber: "asc" },
            });

            return chapters;
        }),

    getChapter: publicProcedure
        .input(z.object({ chapterId: z.string() }))
        .query(async ({ ctx, input }) => {
            const chapter = await ctx.db.chapter.findUnique({
                where: { id: input.chapterId },
                include: { topics: true },
            });

            if (!chapter) throw new TRPCError({ code: "NOT_FOUND" });

            return chapter;
        }),
    translateMessage: publicProcedure
        .input(
            z.object({
                text: z.string(),
                targetLang: z.enum(["kn", "en"]),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { text, targetLang } = input;
            const { OpenAI } = await import("openai");

            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });

            const prompt = `Translate the following text to ${targetLang === "kn" ? "Kannada" : "English"}. strict output, no commentary. Text: "${text}"`;

            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: "You are a professional translator. Translate accurately and naturally.",
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
            });

            const translatedText = response.choices[0].message.content || "Translation failed.";
            return { translatedText };
        }),
});
