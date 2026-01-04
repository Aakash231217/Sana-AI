import { z } from "zod";

import {
    createTRPCRouter,
    publicProcedure,
} from "@/server/api/trpc";

export const testsRouter = createTRPCRouter({

    // Get all available tests
    getAll: publicProcedure.query(async ({ ctx }) => {
        return ctx.db.test.findMany({
            orderBy: { createdAt: "desc" },
        });
    }),

    // Get a specific test with questions
    getById: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const test = await ctx.db.test.findUnique({
                where: { id: input.id },
                include: {
                    questions: {
                        orderBy: { order: "asc" },
                    },
                },
            });
            return test;
        }),

    // Submit test answers
    submit: publicProcedure
        .input(z.object({
            testId: z.string(),
            answers: z.record(z.string(), z.number()), // questionId -> value (1-5)
            scores: z.record(z.string(), z.number()), // section -> score
            studentId: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.testSubmission.create({
                data: {
                    testId: input.testId,
                    studentId: input.studentId,
                    answers: input.answers,
                    scores: input.scores,
                },
            });
        }),
});
