import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const teacherRouter = createTRPCRouter({
    // ============ CLASS MANAGEMENT ============
    getAllClasses: publicProcedure.query(async ({ ctx }) => {
        const classes = await ctx.db.class.findMany({
            orderBy: { name: "asc" },
            include: {
                _count: {
                    select: { students: true },
                },
            },
        });
        return classes;
    }),

    createClass: publicProcedure
        .input(
            z.object({
                name: z.string().min(1, "Class name is required"),
                section: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const existing = await ctx.db.class.findUnique({
                where: { name: input.name },
            });

            if (existing) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: `Class "${input.name}" already exists`,
                });
            }

            const newClass = await ctx.db.class.create({
                data: {
                    name: input.name,
                    section: input.section,
                },
            });

            return newClass;
        }),

    deleteClass: publicProcedure
        .input(z.object({ classId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.class.delete({
                where: { id: input.classId },
            });
            return { success: true };
        }),

    // ============ STUDENT MANAGEMENT ============
    addStudent: publicProcedure
        .input(
            z.object({
                name: z.string().min(1, "Student name is required"),
                email: z.string().email().optional().or(z.literal("")),
                mobile: z.string().optional(),
                rollNumber: z.string().optional(),
                classId: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Check if class exists
            const classExists = await ctx.db.class.findUnique({
                where: { id: input.classId },
            });

            if (!classExists) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Class not found",
                });
            }

            // Check for duplicate roll number in same class
            if (input.rollNumber) {
                const existingStudent = await ctx.db.studentRecord.findFirst({
                    where: {
                        classId: input.classId,
                        rollNumber: input.rollNumber,
                    },
                });

                if (existingStudent) {
                    throw new TRPCError({
                        code: "CONFLICT",
                        message: `Roll number "${input.rollNumber}" already exists in this class`,
                    });
                }
            }

            const student = await ctx.db.studentRecord.create({
                data: {
                    name: input.name,
                    email: input.email || null,
                    mobile: input.mobile || null,
                    rollNumber: input.rollNumber || null,
                    classId: input.classId,
                },
                include: {
                    class: true,
                },
            });

            return student;
        }),

    updateStudent: publicProcedure
        .input(
            z.object({
                studentId: z.string(),
                name: z.string().min(1).optional(),
                email: z.string().email().optional().or(z.literal("")),
                mobile: z.string().optional(),
                rollNumber: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { studentId, ...updateData } = input;

            const student = await ctx.db.studentRecord.update({
                where: { id: studentId },
                data: {
                    name: updateData.name,
                    email: updateData.email || null,
                    mobile: updateData.mobile || null,
                    rollNumber: updateData.rollNumber || null,
                },
                include: {
                    class: true,
                    marks: true,
                },
            });

            return student;
        }),

    deleteStudent: publicProcedure
        .input(z.object({ studentId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.studentRecord.delete({
                where: { id: input.studentId },
            });
            return { success: true };
        }),

    getStudentsByClass: publicProcedure
        .input(
            z.object({
                classId: z.string(),
                search: z.string().optional(),
            })
        )
        .query(async ({ ctx, input }) => {
            const where: any = { classId: input.classId };

            if (input.search) {
                where.OR = [
                    { name: { contains: input.search, mode: "insensitive" } },
                    { rollNumber: { contains: input.search, mode: "insensitive" } },
                    { email: { contains: input.search, mode: "insensitive" } },
                ];
            }

            const students = await ctx.db.studentRecord.findMany({
                where,
                orderBy: [{ rollNumber: "asc" }, { name: "asc" }],
                include: {
                    marks: {
                        orderBy: { subjectName: "asc" },
                    },
                    class: true,
                },
            });

            return students;
        }),

    getStudent: publicProcedure
        .input(z.object({ studentId: z.string() }))
        .query(async ({ ctx, input }) => {
            const student = await ctx.db.studentRecord.findUnique({
                where: { id: input.studentId },
                include: {
                    class: true,
                    marks: {
                        orderBy: { subjectName: "asc" },
                    },
                },
            });

            if (!student) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Student not found",
                });
            }

            return student;
        }),

    // ============ MARKS MANAGEMENT ============
    addStudentMarks: publicProcedure
        .input(
            z.object({
                studentId: z.string(),
                subjectName: z.string().min(1, "Subject name is required"),
                marks: z.number().min(0, "Marks cannot be negative"),
                maxMarks: z.number().min(1, "Max marks must be at least 1").default(100),
                examType: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            // Validate marks <= maxMarks
            if (input.marks > input.maxMarks) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: `Marks (${input.marks}) cannot exceed max marks (${input.maxMarks})`,
                });
            }

            // Check if student exists
            const student = await ctx.db.studentRecord.findUnique({
                where: { id: input.studentId },
            });

            if (!student) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Student not found",
                });
            }

            // Check if marks already exist for this subject + exam type
            const existingMark = await ctx.db.subjectMark.findFirst({
                where: {
                    studentRecordId: input.studentId,
                    subjectName: input.subjectName,
                    examType: input.examType || null,
                },
            });

            if (existingMark) {
                // Update existing marks
                const updatedMark = await ctx.db.subjectMark.update({
                    where: { id: existingMark.id },
                    data: {
                        marks: input.marks,
                        maxMarks: input.maxMarks,
                    },
                });
                return updatedMark;
            }

            // Create new marks
            const mark = await ctx.db.subjectMark.create({
                data: {
                    studentRecordId: input.studentId,
                    subjectName: input.subjectName,
                    marks: input.marks,
                    maxMarks: input.maxMarks,
                    examType: input.examType || null,
                },
            });

            return mark;
        }),

    updateMarks: publicProcedure
        .input(
            z.object({
                markId: z.string(),
                marks: z.number().min(0),
                maxMarks: z.number().min(1).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const existingMark = await ctx.db.subjectMark.findUnique({
                where: { id: input.markId },
            });

            if (!existingMark) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Mark record not found",
                });
            }

            const maxMarks = input.maxMarks ?? existingMark.maxMarks;

            if (input.marks > maxMarks) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: `Marks (${input.marks}) cannot exceed max marks (${maxMarks})`,
                });
            }

            const mark = await ctx.db.subjectMark.update({
                where: { id: input.markId },
                data: {
                    marks: input.marks,
                    maxMarks: input.maxMarks,
                },
            });

            return mark;
        }),

    deleteMarks: publicProcedure
        .input(z.object({ markId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.subjectMark.delete({
                where: { id: input.markId },
            });
            return { success: true };
        }),

    getStudentMarks: publicProcedure
        .input(z.object({ studentId: z.string() }))
        .query(async ({ ctx, input }) => {
            const marks = await ctx.db.subjectMark.findMany({
                where: { studentRecordId: input.studentId },
                orderBy: [{ subjectName: "asc" }, { examType: "asc" }],
            });

            return marks;
        }),

    // ============ BULK IMPORT ============
    bulkImportStudents: publicProcedure
        .input(
            z.object({
                classId: z.string(),
                students: z.array(
                    z.object({
                        studentName: z.string(),
                        email: z.string().optional(),
                        mobile: z.string().optional(),
                        rollNumber: z.string().optional(),
                        subject: z.string(),
                        marks: z.number(),
                        maxMarks: z.number(),
                        examType: z.string().optional(),
                    })
                ),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { classId, students } = input;

            // Check if class exists
            const classExists = await ctx.db.class.findUnique({
                where: { id: classId },
            });

            if (!classExists) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Class not found",
                });
            }

            const results = {
                studentsCreated: 0,
                studentsUpdated: 0,
                marksCreated: 0,
                marksUpdated: 0,
                errors: [] as string[],
            };

            // Group by student name + roll number to handle multiple subjects per student
            const studentMap = new Map<string, typeof students>();

            for (const row of students) {
                const key = `${row.studentName}-${row.rollNumber || 'no-roll'}`;
                if (!studentMap.has(key)) {
                    studentMap.set(key, []);
                }
                studentMap.get(key)!.push(row);
            }

            for (const [key, studentRows] of studentMap) {
                const firstRow = studentRows[0];

                try {
                    // Find or create student
                    let student = await ctx.db.studentRecord.findFirst({
                        where: {
                            classId,
                            OR: [
                                firstRow.rollNumber ? { rollNumber: firstRow.rollNumber } : {},
                                { name: firstRow.studentName },
                            ].filter(obj => Object.keys(obj).length > 0),
                        },
                    });

                    if (!student) {
                        student = await ctx.db.studentRecord.create({
                            data: {
                                name: firstRow.studentName,
                                email: firstRow.email || null,
                                mobile: firstRow.mobile || null,
                                rollNumber: firstRow.rollNumber || null,
                                classId,
                            },
                        });
                        results.studentsCreated++;
                    } else {
                        // Update student info if needed
                        await ctx.db.studentRecord.update({
                            where: { id: student.id },
                            data: {
                                email: firstRow.email || student.email,
                                mobile: firstRow.mobile || student.mobile,
                            },
                        });
                        results.studentsUpdated++;
                    }

                    // Add marks for each subject
                    for (const row of studentRows) {
                        const existingMark = await ctx.db.subjectMark.findFirst({
                            where: {
                                studentRecordId: student.id,
                                subjectName: row.subject,
                                examType: row.examType || null,
                            },
                        });

                        if (existingMark) {
                            await ctx.db.subjectMark.update({
                                where: { id: existingMark.id },
                                data: {
                                    marks: row.marks,
                                    maxMarks: row.maxMarks,
                                },
                            });
                            results.marksUpdated++;
                        } else {
                            await ctx.db.subjectMark.create({
                                data: {
                                    studentRecordId: student.id,
                                    subjectName: row.subject,
                                    marks: row.marks,
                                    maxMarks: row.maxMarks,
                                    examType: row.examType || null,
                                },
                            });
                            results.marksCreated++;
                        }
                    }
                } catch (error) {
                    results.errors.push(
                        `Failed to import ${firstRow.studentName}: ${error instanceof Error ? error.message : 'Unknown error'}`
                    );
                }
            }

            return results;
        }),

    // ============ STATISTICS ============
    getClassSummary: publicProcedure
        .input(z.object({ classId: z.string() }))
        .query(async ({ ctx, input }) => {
            const students = await ctx.db.studentRecord.findMany({
                where: { classId: input.classId },
                include: {
                    marks: true,
                },
            });

            // Calculate statistics
            const totalStudents = students.length;

            // Get all subjects
            const allSubjects = new Set<string>();
            students.forEach(s => s.marks.forEach(m => allSubjects.add(m.subjectName)));

            // Calculate averages per subject
            const subjectStats = Array.from(allSubjects).map(subject => {
                const subjectMarks = students
                    .flatMap(s => s.marks.filter(m => m.subjectName === subject))
                    .map(m => (m.marks / m.maxMarks) * 100);

                const avg = subjectMarks.length > 0
                    ? subjectMarks.reduce((a, b) => a + b, 0) / subjectMarks.length
                    : 0;

                const highest = subjectMarks.length > 0 ? Math.max(...subjectMarks) : 0;
                const lowest = subjectMarks.length > 0 ? Math.min(...subjectMarks) : 0;

                return {
                    subject,
                    average: Math.round(avg * 100) / 100,
                    highest: Math.round(highest * 100) / 100,
                    lowest: Math.round(lowest * 100) / 100,
                    totalStudents: subjectMarks.length,
                };
            });

            // Calculate top performers (overall average)
            const studentAverages = students.map(student => {
                const marks = student.marks;
                if (marks.length === 0) return { student, average: 0 };

                const totalPercentage = marks.reduce((sum, m) => sum + (m.marks / m.maxMarks) * 100, 0);
                return {
                    student,
                    average: Math.round((totalPercentage / marks.length) * 100) / 100,
                };
            });

            const topPerformers = studentAverages
                .sort((a, b) => b.average - a.average)
                .slice(0, 5)
                .map(({ student, average }) => ({
                    id: student.id,
                    name: student.name,
                    rollNumber: student.rollNumber,
                    average,
                }));

            return {
                totalStudents,
                totalSubjects: allSubjects.size,
                subjectStats,
                topPerformers,
            };
        }),
});
