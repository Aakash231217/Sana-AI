import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const attendanceRouter = createTRPCRouter({
    // Get all attendance sessions for a class
    getAttendanceSessions: publicProcedure
        .input(
            z.object({
                classId: z.string(),
                startDate: z.string().optional(),
                endDate: z.string().optional(),
            })
        )
        .query(async ({ ctx, input }) => {
            const where: any = { classId: input.classId };

            if (input.startDate || input.endDate) {
                where.date = {};
                if (input.startDate) where.date.gte = new Date(input.startDate);
                if (input.endDate) where.date.lte = new Date(input.endDate);
            }

            return ctx.db.attendanceSession.findMany({
                where,
                include: {
                    class: {
                        select: { id: true, name: true, section: true },
                    },
                    records: {
                        include: {
                            studentRecord: {
                                select: { id: true, name: true, rollNumber: true },
                            },
                        },
                    },
                    _count: {
                        select: { records: true },
                    },
                },
                orderBy: { date: "desc" },
            });
        }),

    // Get a specific attendance session with all records
    getAttendanceSession: publicProcedure
        .input(z.object({ sessionId: z.string() }))
        .query(async ({ ctx, input }) => {
            const session = await ctx.db.attendanceSession.findUnique({
                where: { id: input.sessionId },
                include: {
                    class: true,
                    records: {
                        include: {
                            studentRecord: true,
                        },
                        orderBy: {
                            studentRecord: { rollNumber: "asc" },
                        },
                    },
                },
            });

            if (!session) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Attendance session not found",
                });
            }

            return session;
        }),

    // Create a new attendance session
    createAttendanceSession: publicProcedure
        .input(
            z.object({
                classId: z.string(),
                date: z.string(),
                subjectName: z.string().optional(),
                notes: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const date = new Date(input.date);
            date.setHours(0, 0, 0, 0);

            // Check if session already exists for this class/date/subject
            const existing = await ctx.db.attendanceSession.findFirst({
                where: {
                    classId: input.classId,
                    date: date,
                    subjectName: input.subjectName || null,
                },
            });

            if (existing) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "Attendance session already exists for this date and subject",
                });
            }

            // Get all students in the class
            const students = await ctx.db.studentRecord.findMany({
                where: { classId: input.classId },
                orderBy: [{ rollNumber: "asc" }, { name: "asc" }],
            });

            if (students.length === 0) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "No students found in this class",
                });
            }

            // Create session with all student records (default: PRESENT)
            const session = await ctx.db.attendanceSession.create({
                data: {
                    classId: input.classId,
                    date: date,
                    subjectName: input.subjectName || null,
                    notes: input.notes,
                    totalPresent: students.length,
                    totalAbsent: 0,
                    totalLate: 0,
                    records: {
                        create: students.map((student) => ({
                            studentRecordId: student.id,
                            status: "PRESENT",
                        })),
                    },
                },
                include: {
                    records: {
                        include: {
                            studentRecord: true,
                        },
                    },
                },
            });

            return session;
        }),

    // Update attendance record for a student
    updateAttendanceRecord: publicProcedure
        .input(
            z.object({
                recordId: z.string(),
                status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
                remarks: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const record = await ctx.db.attendanceRecord.update({
                where: { id: input.recordId },
                data: {
                    status: input.status,
                    remarks: input.remarks,
                    markedAt: new Date(),
                },
                include: {
                    attendanceSession: true,
                },
            });

            // Update session totals
            const allRecords = await ctx.db.attendanceRecord.findMany({
                where: { attendanceSessionId: record.attendanceSessionId },
            });

            const totals = allRecords.reduce(
                (acc, r) => {
                    if (r.status === "PRESENT") acc.present++;
                    else if (r.status === "ABSENT") acc.absent++;
                    else if (r.status === "LATE") acc.late++;
                    return acc;
                },
                { present: 0, absent: 0, late: 0 }
            );

            await ctx.db.attendanceSession.update({
                where: { id: record.attendanceSessionId },
                data: {
                    totalPresent: totals.present,
                    totalAbsent: totals.absent,
                    totalLate: totals.late,
                },
            });

            return record;
        }),

    // Bulk update attendance (for marking multiple students at once)
    bulkUpdateAttendance: publicProcedure
        .input(
            z.object({
                sessionId: z.string(),
                records: z.array(
                    z.object({
                        studentRecordId: z.string(),
                        status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
                        remarks: z.string().optional(),
                    })
                ),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Update each record
            for (const record of input.records) {
                await ctx.db.attendanceRecord.updateMany({
                    where: {
                        attendanceSessionId: input.sessionId,
                        studentRecordId: record.studentRecordId,
                    },
                    data: {
                        status: record.status,
                        remarks: record.remarks,
                        markedAt: new Date(),
                    },
                });
            }

            // Update session totals
            const allRecords = await ctx.db.attendanceRecord.findMany({
                where: { attendanceSessionId: input.sessionId },
            });

            const totals = allRecords.reduce(
                (acc, r) => {
                    if (r.status === "PRESENT") acc.present++;
                    else if (r.status === "ABSENT") acc.absent++;
                    else if (r.status === "LATE") acc.late++;
                    return acc;
                },
                { present: 0, absent: 0, late: 0 }
            );

            const session = await ctx.db.attendanceSession.update({
                where: { id: input.sessionId },
                data: {
                    totalPresent: totals.present,
                    totalAbsent: totals.absent,
                    totalLate: totals.late,
                },
                include: {
                    records: {
                        include: { studentRecord: true },
                    },
                },
            });

            return session;
        }),

    // Import attendance from Excel data
    importAttendanceFromExcel: publicProcedure
        .input(
            z.object({
                classId: z.string(),
                date: z.string(),
                subjectName: z.string().optional(),
                attendanceData: z.array(
                    z.object({
                        rollNumber: z.string().optional(),
                        name: z.string(),
                        status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED", "P", "A", "L", "E"]),
                        remarks: z.string().optional(),
                    })
                ),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const date = new Date(input.date);
            date.setHours(0, 0, 0, 0);

            // Get all students in the class
            const students = await ctx.db.studentRecord.findMany({
                where: { classId: input.classId },
            });

            if (students.length === 0) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "No students found in this class",
                });
            }

            // Map status shortcuts to full status
            const statusMap: Record<string, "PRESENT" | "ABSENT" | "LATE" | "EXCUSED"> = {
                P: "PRESENT",
                A: "ABSENT",
                L: "LATE",
                E: "EXCUSED",
                PRESENT: "PRESENT",
                ABSENT: "ABSENT",
                LATE: "LATE",
                EXCUSED: "EXCUSED",
            };

            // Delete existing session if any
            await ctx.db.attendanceSession.deleteMany({
                where: {
                    classId: input.classId,
                    date: date,
                    subjectName: input.subjectName || null,
                },
            });

            // Match students from Excel data
            const recordsToCreate: {
                studentRecordId: string;
                status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
                remarks?: string;
            }[] = [];

            let matched = 0;
            let unmatched: string[] = [];

            for (const row of input.attendanceData) {
                // Try to find student by roll number first, then by name
                let student = row.rollNumber
                    ? students.find(
                          (s) => s.rollNumber?.toLowerCase() === row.rollNumber?.toLowerCase()
                      )
                    : null;

                if (!student) {
                    student = students.find(
                        (s) => s.name.toLowerCase().trim() === row.name.toLowerCase().trim()
                    );
                }

                if (student) {
                    recordsToCreate.push({
                        studentRecordId: student.id,
                        status: statusMap[row.status.toUpperCase()] || "PRESENT",
                        remarks: row.remarks,
                    });
                    matched++;
                } else {
                    unmatched.push(row.name);
                }
            }

            // Add remaining students (not in Excel) as PRESENT by default
            const matchedIds = new Set(recordsToCreate.map((r) => r.studentRecordId));
            for (const student of students) {
                if (!matchedIds.has(student.id)) {
                    recordsToCreate.push({
                        studentRecordId: student.id,
                        status: "PRESENT",
                    });
                }
            }

            // Calculate totals
            const totals = recordsToCreate.reduce(
                (acc, r) => {
                    if (r.status === "PRESENT") acc.present++;
                    else if (r.status === "ABSENT") acc.absent++;
                    else if (r.status === "LATE") acc.late++;
                    return acc;
                },
                { present: 0, absent: 0, late: 0 }
            );

            // Create session with records
            const session = await ctx.db.attendanceSession.create({
                data: {
                    classId: input.classId,
                    date: date,
                    subjectName: input.subjectName || null,
                    totalPresent: totals.present,
                    totalAbsent: totals.absent,
                    totalLate: totals.late,
                    records: {
                        create: recordsToCreate,
                    },
                },
                include: {
                    records: {
                        include: { studentRecord: true },
                    },
                },
            });

            return {
                session,
                stats: {
                    totalImported: input.attendanceData.length,
                    matched,
                    unmatched,
                },
            };
        }),

    // Get attendance summary for a student
    getStudentAttendanceSummary: publicProcedure
        .input(
            z.object({
                studentRecordId: z.string(),
                startDate: z.string().optional(),
                endDate: z.string().optional(),
            })
        )
        .query(async ({ ctx, input }) => {
            const where: any = { studentRecordId: input.studentRecordId };

            if (input.startDate || input.endDate) {
                where.attendanceSession = {};
                if (input.startDate)
                    where.attendanceSession.date = { gte: new Date(input.startDate) };
                if (input.endDate) {
                    where.attendanceSession.date = {
                        ...where.attendanceSession.date,
                        lte: new Date(input.endDate),
                    };
                }
            }

            const records = await ctx.db.attendanceRecord.findMany({
                where,
                include: {
                    attendanceSession: true,
                },
                orderBy: {
                    attendanceSession: { date: "desc" },
                },
            });

            const summary = {
                total: records.length,
                present: records.filter((r) => r.status === "PRESENT").length,
                absent: records.filter((r) => r.status === "ABSENT").length,
                late: records.filter((r) => r.status === "LATE").length,
                excused: records.filter((r) => r.status === "EXCUSED").length,
                percentage: 0,
            };

            summary.percentage =
                summary.total > 0
                    ? Math.round(((summary.present + summary.late) / summary.total) * 100)
                    : 100;

            return { records, summary };
        }),

    // Get class attendance summary
    getClassAttendanceSummary: publicProcedure
        .input(
            z.object({
                classId: z.string(),
                startDate: z.string().optional(),
                endDate: z.string().optional(),
            })
        )
        .query(async ({ ctx, input }) => {
            const where: any = { classId: input.classId };

            if (input.startDate || input.endDate) {
                where.date = {};
                if (input.startDate) where.date.gte = new Date(input.startDate);
                if (input.endDate) where.date.lte = new Date(input.endDate);
            }

            const sessions = await ctx.db.attendanceSession.findMany({
                where,
                include: {
                    records: {
                        include: {
                            studentRecord: {
                                select: { id: true, name: true, rollNumber: true },
                            },
                        },
                    },
                },
                orderBy: { date: "desc" },
            });

            // Calculate per-student summary
            const studentStats: Record<
                string,
                {
                    id: string;
                    name: string;
                    rollNumber: string | null;
                    present: number;
                    absent: number;
                    late: number;
                    excused: number;
                    total: number;
                    percentage: number;
                }
            > = {};

            for (const session of sessions) {
                for (const record of session.records) {
                    const studentId = record.studentRecordId;
                    if (!studentStats[studentId]) {
                        studentStats[studentId] = {
                            id: studentId,
                            name: record.studentRecord.name,
                            rollNumber: record.studentRecord.rollNumber,
                            present: 0,
                            absent: 0,
                            late: 0,
                            excused: 0,
                            total: 0,
                            percentage: 0,
                        };
                    }

                    studentStats[studentId].total++;
                    if (record.status === "PRESENT") studentStats[studentId].present++;
                    else if (record.status === "ABSENT") studentStats[studentId].absent++;
                    else if (record.status === "LATE") studentStats[studentId].late++;
                    else if (record.status === "EXCUSED") studentStats[studentId].excused++;
                }
            }

            // Calculate percentages
            Object.values(studentStats).forEach((stats) => {
                stats.percentage =
                    stats.total > 0
                        ? Math.round(((stats.present + stats.late) / stats.total) * 100)
                        : 100;
            });

            // Overall class summary
            const totalSessions = sessions.length;
            const overallStats = {
                totalSessions,
                averageAttendance:
                    totalSessions > 0
                        ? Math.round(
                              sessions.reduce((sum, s) => {
                                  const total = s.totalPresent + s.totalAbsent + s.totalLate;
                                  return sum + (total > 0 ? (s.totalPresent + s.totalLate) / total : 1);
                              }, 0) /
                                  totalSessions *
                                  100
                          )
                        : 100,
            };

            return {
                sessions,
                studentStats: Object.values(studentStats).sort((a, b) =>
                    (a.rollNumber || a.name).localeCompare(b.rollNumber || b.name)
                ),
                overallStats,
            };
        }),

    // Delete attendance session
    deleteAttendanceSession: publicProcedure
        .input(z.object({ sessionId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.attendanceSession.delete({
                where: { id: input.sessionId },
            });
            return { success: true };
        }),
});
