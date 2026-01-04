import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { openai } from "@/lib/openai";

export const adminRouter = createTRPCRouter({
  // ============ DASHBOARD STATS ============
  getDashboardStats: publicProcedure.query(async ({ ctx }) => {
    const [
      totalStudents,
      activeStudents,
      flaggedStudents,
      totalQueries,
      suspiciousQueries,
      unresolvedFlags,
      todayQueries,
    ] = await Promise.all([
      ctx.db.student.count(),
      ctx.db.student.count({ where: { isActive: true } }),
      ctx.db.student.count({ where: { isFlagged: true } }),
      ctx.db.studentQuery.count(),
      ctx.db.studentQuery.count({ where: { isSuspicious: true } }),
      ctx.db.studentFlag.count({ where: { isResolved: false } }),
      ctx.db.studentQuery.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    // Get queries trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const queriesByDay = await ctx.db.studentQuery.groupBy({
      by: ["createdAt"],
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
      _count: true,
    });

    // Get category distribution
    const categoryDistribution = await ctx.db.studentQuery.groupBy({
      by: ["category"],
      _count: true,
    });

    return {
      totalStudents,
      activeStudents,
      flaggedStudents,
      totalQueries,
      suspiciousQueries,
      unresolvedFlags,
      todayQueries,
      queriesByDay,
      categoryDistribution,
    };
  }),

  // ============ STUDENT MANAGEMENT ============
  getAllStudents: publicProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
        search: z.string().optional(),
        filterFlagged: z.boolean().optional(),
        sortBy: z.enum(["lastActive", "totalQueries", "createdAt"]).default("lastActive"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, filterFlagged, sortBy, sortOrder } = input;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }
      if (filterFlagged) {
        where.isFlagged = true;
      }

      const [students, total] = await Promise.all([
        ctx.db.student.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            _count: {
              select: {
                queries: true,
                flags: { where: { isResolved: false } },
              },
            },
            careerInsight: {
              select: {
                careerGoal: true,
                aiSummary: true,
              },
            },
          },
        }),
        ctx.db.student.count({ where }),
      ]);

      return {
        students,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      };
    }),

  getStudentDetails: publicProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const student = await ctx.db.student.findUnique({
        where: { id: input.studentId },
        include: {
          queries: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
          flags: {
            orderBy: { createdAt: "desc" },
          },
          careerInsight: true,
          activityLogs: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      });

      if (!student) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });
      }

      return student;
    }),

  // ============ QUERY MONITORING ============
  getRecentQueries: publicProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(50),
        studentId: z.string().optional(),
        category: z.string().optional(),
        onlySuspicious: z.boolean().default(false),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, studentId, category, onlySuspicious, dateFrom, dateTo } = input;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (studentId) where.studentId = studentId;
      if (category) where.category = category;
      if (onlySuspicious) where.isSuspicious = true;
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
      }

      const [queries, total] = await Promise.all([
        ctx.db.studentQuery.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                isFlagged: true,
              },
            },
            flags: {
              where: { isResolved: false },
            },
          },
        }),
        ctx.db.studentQuery.count({ where }),
      ]);

      return {
        queries,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      };
    }),

  // ============ FLAGGING SYSTEM ============
  createFlag: publicProcedure
    .input(
      z.object({
        studentId: z.string(),
        queryId: z.string().optional(),
        flagType: z.enum([
          "INAPPROPRIATE_CONTENT",
          "SUSPICIOUS_BEHAVIOR",
          "ACADEMIC_DISHONESTY",
          "HARASSMENT",
          "SPAM",
          "OFF_TOPIC",
          "OTHER",
        ]),
        severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
        reason: z.string(),
        details: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const flag = await ctx.db.studentFlag.create({
        data: {
          studentId: input.studentId,
          queryId: input.queryId,
          flagType: input.flagType,
          severity: input.severity,
          reason: input.reason,
          details: input.details,
        },
      });

      // Update student flagged status for HIGH or CRITICAL severity
      if (input.severity === "HIGH" || input.severity === "CRITICAL") {
        await ctx.db.student.update({
          where: { id: input.studentId },
          data: {
            isFlagged: true,
            flagReason: input.reason,
          },
        });
      }

      return flag;
    }),

  resolveFlag: publicProcedure
    .input(
      z.object({
        flagId: z.string(),
        resolutionNote: z.string(),
        resolvedBy: z.string().default("Admin"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const flag = await ctx.db.studentFlag.update({
        where: { id: input.flagId },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
          resolvedBy: input.resolvedBy,
          resolutionNote: input.resolutionNote,
        },
        include: { student: true },
      });

      // Check if student has any remaining unresolved flags
      const remainingFlags = await ctx.db.studentFlag.count({
        where: {
          studentId: flag.studentId,
          isResolved: false,
        },
      });

      // If no remaining flags, unflag the student
      if (remainingFlags === 0) {
        await ctx.db.student.update({
          where: { id: flag.studentId },
          data: {
            isFlagged: false,
            flagReason: null,
          },
        });
      }

      return flag;
    }),

  getAllFlags: publicProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
        onlyUnresolved: z.boolean().default(true),
        severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, onlyUnresolved, severity } = input;
      const skip = (page - 1) * limit;

      const where: any = {};
      if (onlyUnresolved) where.isResolved = false;
      if (severity) where.severity = severity;

      const [flags, total] = await Promise.all([
        ctx.db.studentFlag.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            query: {
              select: {
                id: true,
                query: true,
                category: true,
              },
            },
          },
        }),
        ctx.db.studentFlag.count({ where }),
      ]);

      return {
        flags,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      };
    }),

  // ============ AI ANALYSIS & CAREER INSIGHTS ============
  analyzeStudentQueries: publicProcedure
    .input(z.object({ studentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const student = await ctx.db.student.findUnique({
        where: { id: input.studentId },
        include: {
          queries: {
            orderBy: { createdAt: "desc" },
            take: 100,
          },
        },
      });

      if (!student) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Student not found" });
      }

      if (student.queries.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No queries to analyze",
        });
      }

      // Prepare queries for analysis
      const queriesText = student.queries
        .map((q, i) => `${i + 1}. [${q.category}] ${q.query}`)
        .join("\n");

      // Use OpenAI to analyze student queries and generate career insights
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an AI analyst for an educational platform. Analyze the student's queries and provide insights about:
1. Their career interests and goals
2. Learning patterns and preferences
3. Strengths (subjects they engage with most)
4. Areas needing improvement
5. Recommended career paths based on their interests
6. Overall learning motivation level
7. Any concerning patterns or flags

Respond in JSON format:
{
  "careerGoal": "string - inferred career goal",
  "interests": ["array of interests"],
  "strengths": ["array of strengths"],
  "weaknesses": ["array of areas to improve"],
  "recommendedPaths": ["array of career recommendations"],
  "learningStyle": "visual/auditory/reading/kinesthetic",
  "motivationLevel": "high/medium/low",
  "summary": "detailed paragraph summary of the student's profile",
  "flags": ["any concerning patterns observed"],
  "queryPatterns": {
    "mostCommonTopics": ["topics"],
    "peakActivityTime": "time pattern",
    "averageQueryComplexity": "basic/intermediate/advanced"
  }
}`,
          },
          {
            role: "user",
            content: `Analyze these ${student.queries.length} queries from student "${student.name}":\n\n${queriesText}`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const analysis = JSON.parse(completion.choices[0].message.content || "{}");

      // Update or create career insight
      const careerInsight = await ctx.db.careerInsight.upsert({
        where: { studentId: input.studentId },
        update: {
          careerGoal: analysis.careerGoal,
          interests: analysis.interests || [],
          strengths: analysis.strengths || [],
          weaknesses: analysis.weaknesses || [],
          recommendedPaths: analysis.recommendedPaths || [],
          aiSummary: analysis.summary,
          learningStyle: analysis.learningStyle,
          motivationLevel: analysis.motivationLevel,
          queryPatterns: analysis.queryPatterns,
          lastAnalyzed: new Date(),
        },
        create: {
          studentId: input.studentId,
          careerGoal: analysis.careerGoal,
          interests: analysis.interests || [],
          strengths: analysis.strengths || [],
          weaknesses: analysis.weaknesses || [],
          recommendedPaths: analysis.recommendedPaths || [],
          aiSummary: analysis.summary,
          learningStyle: analysis.learningStyle,
          motivationLevel: analysis.motivationLevel,
          queryPatterns: analysis.queryPatterns,
          lastAnalyzed: new Date(),
        },
      });

      // Auto-flag if concerning patterns detected
      if (analysis.flags && analysis.flags.length > 0) {
        for (const flag of analysis.flags) {
          await ctx.db.studentFlag.create({
            data: {
              studentId: input.studentId,
              flagType: "SUSPICIOUS_BEHAVIOR",
              severity: "MEDIUM",
              reason: flag,
              details: "Auto-detected by AI analysis",
            },
          });
        }
      }

      return {
        careerInsight,
        analysis,
      };
    }),

  getCareerInsight: publicProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const insight = await ctx.db.careerInsight.findUnique({
        where: { studentId: input.studentId },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              totalQueries: true,
            },
          },
        },
      });

      return insight;
    }),

  // ============ QUERY LOGGING (for use in chat routes) ============
  logStudentQuery: publicProcedure
    .input(
      z.object({
        sessionKey: z.string(),
        studentName: z.string().optional(),
        studentEmail: z.string().optional(),
        query: z.string(),
        response: z.string().optional(),
        fileId: z.string().optional(),
        subjectName: z.string().optional(),
        responseTime: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get or create student
      let student = await ctx.db.student.findUnique({
        where: { sessionKey: input.sessionKey },
      });

      if (!student) {
        student = await ctx.db.student.create({
          data: {
            sessionKey: input.sessionKey,
            name: input.studentName || `Student-${input.sessionKey.slice(0, 8)}`,
            email: input.studentEmail || `${input.sessionKey.slice(0, 8)}@sana.local`,
          },
        });
      }

      // Analyze query for suspicious content
      const suspiciousKeywords = await ctx.db.adminSettings.findFirst();
      const keywords = suspiciousKeywords?.suspiciousKeywords || [
        "cheat",
        "hack",
        "answer key",
        "exam answers",
        "bypass",
      ];

      const isSuspicious = keywords.some((keyword) =>
        input.query.toLowerCase().includes(keyword.toLowerCase())
      );

      // Categorize the query using simple heuristics
      let category: "GENERAL" | "ACADEMIC" | "CAREER" | "PERSONAL" | "OFF_TOPIC" | "INAPPROPRIATE" =
        "GENERAL";
      const queryLower = input.query.toLowerCase();

      if (
        queryLower.includes("career") ||
        queryLower.includes("job") ||
        queryLower.includes("profession")
      ) {
        category = "CAREER";
      } else if (
        queryLower.includes("study") ||
        queryLower.includes("learn") ||
        queryLower.includes("chapter") ||
        queryLower.includes("topic")
      ) {
        category = "ACADEMIC";
      } else if (
        queryLower.includes("feel") ||
        queryLower.includes("stress") ||
        queryLower.includes("help me")
      ) {
        category = "PERSONAL";
      }

      // Create the query log
      const queryLog = await ctx.db.studentQuery.create({
        data: {
          studentId: student.id,
          query: input.query,
          response: input.response,
          fileId: input.fileId,
          subjectName: input.subjectName,
          category,
          isSuspicious,
          suspicionReason: isSuspicious ? "Contains suspicious keywords" : null,
          responseTime: input.responseTime,
        },
      });

      // Update student stats
      await ctx.db.student.update({
        where: { id: student.id },
        data: {
          totalQueries: { increment: 1 },
          lastActive: new Date(),
        },
      });

      // Auto-flag if suspicious
      if (isSuspicious) {
        await ctx.db.studentFlag.create({
          data: {
            studentId: student.id,
            queryId: queryLog.id,
            flagType: "SUSPICIOUS_BEHAVIOR",
            severity: "MEDIUM",
            reason: "Query contains suspicious keywords",
            details: `Query: "${input.query}"`,
          },
        });
      }

      return queryLog;
    }),

  // ============ ADMIN SETTINGS ============
  getAdminSettings: publicProcedure.query(async ({ ctx }) => {
    let settings = await ctx.db.adminSettings.findFirst();

    if (!settings) {
      settings = await ctx.db.adminSettings.create({
        data: {
          suspiciousKeywords: [
            "cheat",
            "hack",
            "answer key",
            "exam answers",
            "bypass",
            "copy",
            "plagiarism",
          ],
          autoFlagThreshold: 5,
          enableAutoAnalysis: true,
          analysisInterval: 24,
        },
      });
    }

    return settings;
  }),

  updateAdminSettings: publicProcedure
    .input(
      z.object({
        suspiciousKeywords: z.array(z.string()).optional(),
        autoFlagThreshold: z.number().optional(),
        enableAutoAnalysis: z.boolean().optional(),
        analysisInterval: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.adminSettings.findFirst();

      if (existing) {
        return ctx.db.adminSettings.update({
          where: { id: existing.id },
          data: input,
        });
      }

      return ctx.db.adminSettings.create({
        data: {
          suspiciousKeywords: input.suspiciousKeywords || [],
          autoFlagThreshold: input.autoFlagThreshold || 5,
          enableAutoAnalysis: input.enableAutoAnalysis ?? true,
          analysisInterval: input.analysisInterval || 24,
        },
      });
    }),

  // ============ BULK ANALYSIS ============
  analyzeAllStudents: publicProcedure.mutation(async ({ ctx }) => {
    const students = await ctx.db.student.findMany({
      where: {
        queries: { some: {} },
      },
      include: {
        careerInsight: true,
      },
    });

    const results = [];

    for (const student of students) {
      // Skip if recently analyzed (within 24 hours)
      if (
        student.careerInsight?.lastAnalyzed &&
        new Date().getTime() - student.careerInsight.lastAnalyzed.getTime() < 24 * 60 * 60 * 1000
      ) {
        results.push({ studentId: student.id, status: "skipped", reason: "Recently analyzed" });
        continue;
      }

      try {
        // Use the same analysis logic but simplified for bulk
        const queries = await ctx.db.studentQuery.findMany({
          where: { studentId: student.id },
          orderBy: { createdAt: "desc" },
          take: 50,
        });

        if (queries.length < 5) {
          results.push({
            studentId: student.id,
            status: "skipped",
            reason: "Not enough queries",
          });
          continue;
        }

        const queriesText = queries.map((q, i) => `${i + 1}. ${q.query}`).join("\n");

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Briefly analyze these student queries. Return JSON: { "careerGoal": "string", "summary": "2 sentences max", "concerningPatterns": boolean }`,
            },
            {
              role: "user",
              content: queriesText,
            },
          ],
          response_format: { type: "json_object" },
        });

        const analysis = JSON.parse(completion.choices[0].message.content || "{}");

        await ctx.db.careerInsight.upsert({
          where: { studentId: student.id },
          update: {
            careerGoal: analysis.careerGoal,
            aiSummary: analysis.summary,
            lastAnalyzed: new Date(),
          },
          create: {
            studentId: student.id,
            careerGoal: analysis.careerGoal,
            aiSummary: analysis.summary,
            lastAnalyzed: new Date(),
          },
        });

        results.push({ studentId: student.id, status: "success" });
      } catch (error) {
        results.push({ studentId: student.id, status: "error", error: String(error) });
      }
    }

    return { analyzed: results.filter((r) => r.status === "success").length, results };
  }),

  // ============ MARKS MANAGEMENT ============
  getClasses: publicProcedure.query(async ({ ctx }) => {
    const classes = await ctx.db.class.findMany({
      include: {
        _count: {
          select: { students: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return classes.map((c) => ({
      id: c.id,
      name: c.name,
      section: c.section,
      studentCount: c._count.students,
    }));
  }),

  getStudentsByClass: publicProcedure
    .input(z.object({ classId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.studentRecord.findMany({
        where: { classId: input.classId },
        include: {
          marks: true,
        },
        orderBy: { name: "asc" },
      });
    }),


  createClass: publicProcedure
    .input(z.object({ name: z.string(), section: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      // Check if class exists
      const existing = await ctx.db.class.findFirst({
        where: { name: input.name },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Class with this name already exists",
        });
      }

      return ctx.db.class.create({
        data: {
          name: input.name,
          section: input.section,
        },
      });
    }),

  createStudent: publicProcedure
    .input(
      z.object({
        name: z.string(),
        classId: z.string(),
        rollNumber: z.string().optional(),
        admissionNumber: z.string().optional(),
        email: z.string().email().optional(),
        mobile: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check duplicate admission number if provided
      if (input.admissionNumber) {
        const existing = await ctx.db.studentRecord.findUnique({
          where: { admissionNumber: input.admissionNumber },
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Admission Number ${input.admissionNumber} already exists`,
          });
        }
      }

      // Check duplicate roll number in same class if provided
      if (input.rollNumber) {
        const existing = await ctx.db.studentRecord.findUnique({
          where: {
            classId_rollNumber: {
              classId: input.classId,
              rollNumber: input.rollNumber,
            },
          },
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Roll Number ${input.rollNumber} already exists in this class`,
          });
        }
      }

      return ctx.db.studentRecord.create({
        data: {
          name: input.name,
          classId: input.classId,
          rollNumber: input.rollNumber,
          admissionNumber: input.admissionNumber,
          email: input.email,
          mobile: input.mobile,
        },
      });
    }),

  bulkImportStudents: publicProcedure
    .input(
      z.object({
        classId: z.string(),
        students: z.array(
          z.object({
            name: z.string(),
            rollNumber: z.string().optional(),
            admissionNumber: z.string().optional(),
            email: z.string().optional(),
            mobile: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const student of input.students) {
        try {
          // Check duplicates manually to provide detailed errors
          if (student.rollNumber) {
            const existingRoll = await ctx.db.studentRecord.findFirst({
              where: {
                classId: input.classId,
                rollNumber: String(student.rollNumber),
              },
            });
            if (existingRoll) {
              // Update existing student instead of failing?
              // For now, let's update if found, or create new.
              // Actually, user requested "create", let's upsert based on rollno if present
              await ctx.db.studentRecord.update({
                where: { id: existingRoll.id },
                data: {
                  name: student.name,
                  admissionNumber: student.admissionNumber,
                  email: student.email,
                  mobile: student.mobile,
                }
              });
              results.success++;
              continue;
            }
          }

          if (student.admissionNumber) {
            const existingAdm = await ctx.db.studentRecord.findUnique({
              where: { admissionNumber: String(student.admissionNumber) },
            });
            if (existingAdm) {
              // For safety, fail if admission number conflicts with DIFFERENT student (not implementing complex merge logic yet)
              results.failed++;
              results.errors.push(`Admission No ${student.admissionNumber} already exists for ${existingAdm.name}`);
              continue;
            }
          }

          // Create new
          await ctx.db.studentRecord.create({
            data: {
              name: student.name,
              classId: input.classId,
              rollNumber: student.rollNumber ? String(student.rollNumber) : undefined,
              admissionNumber: student.admissionNumber ? String(student.admissionNumber) : undefined,
              email: student.email,
              mobile: student.mobile,
            },
          });
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(
            `Failed to import ${student.name}: ${(error as Error).message}`
          );
        }
      }

      return results;
    }),

  // ============ EXAM & MARKS MANAGEMENT ============

  createExam: publicProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.exam.findUnique({
        where: {
          name: input.name,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Exam with this name already exists",
        });
      }

      return ctx.db.exam.create({
        data: {
          name: input.name,
        },
      });
    }),

  getExams: publicProcedure
    .query(async ({ ctx }) => {
      return ctx.db.exam.findMany({
        orderBy: { date: "desc" },
      });
    }),

  uploadMarksBulk: publicProcedure
    .input(
      z.object({
        classId: z.string(),
        examId: z.string(),
        marks: z.array(
          z.object({
            rollNumber: z.string(), // We use roll number to match students
            subject: z.string(),
            score: z.number(),
            maxMarks: z.number().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      // Get all students in this class to map roll numbers to IDs
      const students = await ctx.db.studentRecord.findMany({
        where: { classId: input.classId },
      });

      const studentMap = new Map(students.map((s) => [s.rollNumber, s]));

      for (const mark of input.marks) {
        const student = studentMap.get(mark.rollNumber);

        if (!student) {
          results.failed++;
          results.errors.push(`Student with Roll No ${mark.rollNumber} not found`);
          continue;
        }

        try {
          // Use upsert with the unique constraint
          await ctx.db.subjectMark.upsert({
            where: {
              studentRecordId_subjectName_examId: {
                studentRecordId: student.id,
                subjectName: mark.subject,
                examId: input.examId,
              },
            },
            update: {
              marks: mark.score,
              maxMarks: mark.maxMarks || 100,
            },
            create: {
              studentRecordId: student.id,
              subjectName: mark.subject,
              marks: mark.score,
              maxMarks: mark.maxMarks || 100,
              examId: input.examId,
            },
          });
          results.success++;
        } catch (error) {
          console.error("Mark upload error:", error);
          results.failed++;
          results.errors.push(
            `Failed to update ${mark.subject} for Roll No ${mark.rollNumber}: ${(error as Error).message}`
          );
        }
      }

      return results;
    }),

  updateStudentMark: publicProcedure
    .input(
      z.object({
        studentRecordId: z.string(),
        examId: z.string(),
        subjectName: z.string(),
        marks: z.number(),
        maxMarks: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.subjectMark.upsert({
        where: {
          studentRecordId_subjectName_examId: {
            studentRecordId: input.studentRecordId,
            subjectName: input.subjectName,
            examId: input.examId,
          },
        },
        update: {
          marks: input.marks,
          maxMarks: input.maxMarks || 100,
        },
        create: {
          studentRecordId: input.studentRecordId,
          subjectName: input.subjectName,
          marks: input.marks,
          maxMarks: input.maxMarks || 100,
          examId: input.examId,
        },
      });
    }),
});

