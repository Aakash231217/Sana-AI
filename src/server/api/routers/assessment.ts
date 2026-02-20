import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { SessionStatus } from "@prisma/client";

export const assessmentRouter = createTRPCRouter({
    createChild: publicProcedure
        .input(z.object({ grade: z.number().min(3).max(10) }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.child.create({
                data: { grade: input.grade },
            });
        }),

    startSession: publicProcedure
        .input(
            z.object({
                childId: z.string(),
                appVersion: z.string().optional(),
                configVersion: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.db.assessmentSession.create({
                data: {
                    childId: input.childId,
                    appVersion: input.appVersion,
                    configVersion: input.configVersion,
                    status: SessionStatus.IN_PROGRESS,
                },
            });
        }),

    logTrials: publicProcedure
        .input(
            z.object({
                sessionId: z.string(),
                trials: z.array(
                    z.object({
                        gameId: z.string(),
                        trialIndex: z.number(),
                        trialStartMs: z.number(),
                        stimulusType: z.string(),
                        rtMs: z.number().nullish(),
                        responseCode: z.string().nullish(),
                        correct: z.boolean().nullish(),
                        flags: z.any().optional(),
                    })
                ),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.db.assessmentTrial.createMany({
                data: input.trials.map((t) => ({
                    sessionId: input.sessionId,
                    gameId: t.gameId,
                    trialIndex: t.trialIndex,
                    trialStartMs: t.trialStartMs,
                    stimulusType: t.stimulusType,
                    rtMs: t.rtMs,
                    responseCode: t.responseCode,
                    correct: t.correct,
                    flags: t.flags ? t.flags : undefined,
                })),
            });
        }),

    saveTaskResult: publicProcedure
        .input(
            z.object({
                sessionId: z.string(),
                gameId: z.string(),
                rL: z.number().nullable().optional(),
                rM: z.number().nullable().optional(),
                rH: z.number().nullable().optional(),
                fpeak: z.number().nullable().optional(),
                slope: z.number().nullable().optional(),
                missRate: z.number().nullable().optional(),
                commissionRate: z.number().nullable().optional(),
                accuracy: z.number().nullable().optional(),
                switchCostMs: z.number().nullable().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { sessionId, gameId, ...metrics } = input;
            return ctx.db.taskResult.upsert({
                where: {
                    sessionId_gameId: {
                        sessionId,
                        gameId,
                    },
                },
                create: {
                    sessionId,
                    gameId,
                    ...metrics,
                },
                update: {
                    ...metrics,
                },
            });
        }),

    finalizeSession: publicProcedure
        .input(
            z.object({
                sessionId: z.string(),
                status: z.enum(["COMPLETED", "PARTIAL"]),
                reportPlanJson: z.any().optional(),
                indices: z
                    .object({
                        asi: z.number().nullable().optional(),
                        ici: z.number().nullable().optional(),
                        wme: z.number().nullable().optional(),
                        pci: z.number().nullable().optional(),
                        cfi: z.number().nullable().optional(),
                        priorityDomain: z.string().nullable().optional(),
                    })
                    .optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.db.$transaction(async (tx) => {
                // Update session status
                const session = await tx.assessmentSession.update({
                    where: { id: input.sessionId },
                    data: {
                        status: input.status,
                        endedAt: new Date(),
                    },
                });

                // Save report if provided
                if (input.reportPlanJson) {
                    await tx.assessmentReport.upsert({
                        where: { sessionId: input.sessionId },
                        create: {
                            sessionId: input.sessionId,
                            planJson: input.reportPlanJson,
                        },
                        update: {
                            planJson: input.reportPlanJson,
                        },
                    });
                }

                // Update profile indices if provided
                if (input.indices) {
                    await tx.cognitiveProfile.create({
                        data: {
                            childId: session.childId,
                            asi: input.indices.asi,
                            ici: input.indices.ici,
                            wme: input.indices.wme,
                            pci: input.indices.pci,
                            cfi: input.indices.cfi,
                            priorityDomain: input.indices.priorityDomain,
                        },
                    });
                }

                return session;
            });
        }),

    getChildHistory: publicProcedure
        .input(z.object({ childId: z.string() }))
        .query(async ({ ctx, input }) => {
            return ctx.db.assessmentSession.findMany({
                where: { childId: input.childId },
                orderBy: { startedAt: "desc" },
                take: 3,
                include: {
                    report: true,
                    taskResults: true,
                },
            });
        }),
});
