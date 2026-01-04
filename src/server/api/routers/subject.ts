import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const subjectRouter = createTRPCRouter({
    createSubject: publicProcedure
        .input(z.object({ name: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            return await ctx.db.subject.create({
                data: {
                    name: input.name,
                },
            });
        }),

    getSubjects: publicProcedure.query(async ({ ctx }) => {
        return await ctx.db.subject.findMany({
            include: {
                _count: {
                    select: { files: true },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }),

    getSubject: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const subject = await ctx.db.subject.findUnique({
                where: { id: input.id },
            });
            if (!subject) throw new TRPCError({ code: "NOT_FOUND" });
            return subject;
        }),

    createSubfolder: publicProcedure
        .input(z.object({ name: z.string().min(1), subjectId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return await ctx.db.subfolder.create({
                data: {
                    name: input.name,
                    subjectId: input.subjectId,
                },
            });
        }),

    getSubfolders: publicProcedure
        .input(z.object({ subjectId: z.string() }))
        .query(async ({ ctx, input }) => {
            return await ctx.db.subfolder.findMany({
                where: { subjectId: input.subjectId },
                include: {
                    _count: {
                        select: { files: true },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            });
        }),

    getSubfolder: publicProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const subfolder = await ctx.db.subfolder.findUnique({
                where: { id: input.id },
            });
            if (!subfolder) throw new TRPCError({ code: "NOT_FOUND" });
            return subfolder;
        }),
});
