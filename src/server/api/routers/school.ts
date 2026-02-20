import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const schoolRouter = createTRPCRouter({
  // ============ DAILY ACTIVITIES / DASHBOARD STATS ============
  getDailyActivities: publicProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalInquiries,
      todayInquiries,
      newInquiries,
      totalAdmissions,
      pendingAdmissions,
      bookedAdmissions,
      totalBookingAmount,
      totalFeesPending,
      totalFeesPaid,
      todayPayments,
      upcomingHolidays,
      totalBranches,
    ] = await Promise.all([
      ctx.db.schoolInquiry.count(),
      ctx.db.schoolInquiry.count({
        where: { createdAt: { gte: today, lt: tomorrow } },
      }),
      ctx.db.schoolInquiry.count({
        where: { status: "NEW" },
      }),
      ctx.db.studentAdmission.count(),
      ctx.db.studentAdmission.count({
        where: { admissionStatus: "PENDING" },
      }),
      ctx.db.studentAdmission.count({
        where: { admissionStatus: "BOOKED" },
      }),
      ctx.db.studentAdmission.aggregate({
        _sum: { bookingAmount: true },
      }),
      ctx.db.studentAdmission.aggregate({
        _sum: { feesPending: true },
      }),
      ctx.db.studentAdmission.aggregate({
        _sum: { feesPaid: true },
      }),
      ctx.db.feePayment.aggregate({
        where: { paymentDate: { gte: today, lt: tomorrow } },
        _sum: { amount: true },
        _count: true,
      }),
      ctx.db.calendarEvent.findMany({
        where: {
          date: { gte: today },
          eventType: "HOLIDAY",
        },
        orderBy: { date: "asc" },
        take: 5,
      }),
      ctx.db.schoolBranch.count({ where: { isActive: true } }),
    ]);

    // Inquiry trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentInquiries = await ctx.db.schoolInquiry.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, status: true },
    });

    // Group by day
    const inquiryTrend: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      inquiryTrend[d.toISOString().split("T")[0]!] = 0;
    }
    recentInquiries.forEach((inq) => {
      const key = inq.createdAt.toISOString().split("T")[0]!;
      if (inquiryTrend[key] !== undefined) inquiryTrend[key]++;
    });

    // Inquiry by source
    const inquiryBySource = await ctx.db.schoolInquiry.groupBy({
      by: ["source"],
      _count: true,
    });

    // Admission by status
    const admissionByStatus = await ctx.db.studentAdmission.groupBy({
      by: ["admissionStatus"],
      _count: true,
    });

    return {
      totalInquiries,
      todayInquiries,
      newInquiries,
      totalAdmissions,
      pendingAdmissions,
      bookedAdmissions,
      totalBookingAmount: totalBookingAmount._sum.bookingAmount || 0,
      totalFeesPending: totalFeesPending._sum.feesPending || 0,
      totalFeesPaid: totalFeesPaid._sum.feesPaid || 0,
      todayPayments: {
        count: todayPayments._count,
        amount: todayPayments._sum.amount || 0,
      },
      upcomingHolidays,
      totalBranches,
      inquiryTrend,
      inquiryBySource,
      admissionByStatus,
    };
  }),

  // ============ INQUIRIES ============
  getInquiries: publicProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
        status: z.string().optional(),
        source: z.string().optional(),
        search: z.string().optional(),
        branchId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, status, source, search, branchId } = input;
      const skip = (page - 1) * limit;
      const where: any = {};

      if (status) where.status = status;
      if (source) where.source = source;
      if (branchId) where.branchId = branchId;
      if (search) {
        where.OR = [
          { parentName: { contains: search, mode: "insensitive" } },
          { studentName: { contains: search, mode: "insensitive" } },
          { parentPhone: { contains: search, mode: "insensitive" } },
        ];
      }

      const [inquiries, total] = await Promise.all([
        ctx.db.schoolInquiry.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: { branch: { select: { name: true } } },
        }),
        ctx.db.schoolInquiry.count({ where }),
      ]);

      return { inquiries, total, pages: Math.ceil(total / limit) };
    }),

  createInquiry: publicProcedure
    .input(
      z.object({
        parentName: z.string().min(1),
        parentPhone: z.string().min(1),
        parentEmail: z.string().optional(),
        studentName: z.string().min(1),
        classAppliedFor: z.string().min(1),
        source: z.enum(["WALK_IN", "PHONE", "WEBSITE", "REFERRAL", "SOCIAL_MEDIA", "OTHER"]).default("WALK_IN"),
        notes: z.string().optional(),
        followUpDate: z.string().optional(),
        branchId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.schoolInquiry.create({
        data: {
          ...input,
          followUpDate: input.followUpDate ? new Date(input.followUpDate) : undefined,
        },
      });
    }),

  updateInquiryStatus: publicProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["NEW", "CONTACTED", "FOLLOW_UP", "CONVERTED", "CLOSED"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.schoolInquiry.update({
        where: { id: input.id },
        data: { status: input.status, notes: input.notes },
      });
    }),

  deleteInquiry: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.schoolInquiry.delete({ where: { id: input.id } });
    }),

  // ============ STUDENT ADMISSION ============
  getAdmissions: publicProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
        status: z.string().optional(),
        search: z.string().optional(),
        branchId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, status, search, branchId } = input;
      const skip = (page - 1) * limit;
      const where: any = {};

      if (status) where.admissionStatus = status;
      if (branchId) where.branchId = branchId;
      if (search) {
        where.OR = [
          { studentName: { contains: search, mode: "insensitive" } },
          { parentPhone: { contains: search, mode: "insensitive" } },
          { admissionNumber: { contains: search, mode: "insensitive" } },
        ];
      }

      const [admissions, total] = await Promise.all([
        ctx.db.studentAdmission.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            branch: { select: { name: true } },
            _count: { select: { feePayments: true } },
          },
        }),
        ctx.db.studentAdmission.count({ where }),
      ]);

      return { admissions, total, pages: Math.ceil(total / limit) };
    }),

  createAdmission: publicProcedure
    .input(
      z.object({
        studentName: z.string().min(1),
        fatherName: z.string().optional(),
        motherName: z.string().optional(),
        dateOfBirth: z.string().optional(),
        gender: z.string().optional(),
        classApplied: z.string().min(1),
        previousSchool: z.string().optional(),
        address: z.string().optional(),
        parentPhone: z.string().min(1),
        parentEmail: z.string().optional(),
        bookingAmount: z.number().default(0),
        totalFees: z.number().default(0),
        branchId: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const feesPending = input.totalFees - input.bookingAmount;
      return ctx.db.studentAdmission.create({
        data: {
          ...input,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
          feesPaid: input.bookingAmount,
          feesPending: feesPending > 0 ? feesPending : 0,
          bookingDate: input.bookingAmount > 0 ? new Date() : undefined,
          admissionStatus: input.bookingAmount > 0 ? "BOOKED" : "PENDING",
        },
      });
    }),

  updateAdmissionStatus: publicProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["PENDING", "BOOKED", "ADMITTED", "REJECTED", "CANCELLED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.studentAdmission.update({
        where: { id: input.id },
        data: {
          admissionStatus: input.status,
          admissionDate: input.status === "ADMITTED" ? new Date() : undefined,
        },
      });
    }),

  // Fee Payment
  addFeePayment: publicProcedure
    .input(
      z.object({
        admissionId: z.string(),
        amount: z.number().positive(),
        paymentMode: z.enum(["CASH", "CHEQUE", "ONLINE", "UPI", "CARD"]).default("CASH"),
        receiptNumber: z.string().optional(),
        remarks: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const admission = await ctx.db.studentAdmission.findUnique({
        where: { id: input.admissionId },
      });
      if (!admission) throw new Error("Admission not found");

      const payment = await ctx.db.feePayment.create({ data: input });

      // Update admission fee totals
      await ctx.db.studentAdmission.update({
        where: { id: input.admissionId },
        data: {
          feesPaid: { increment: input.amount },
          feesPending: { decrement: input.amount },
        },
      });

      return payment;
    }),

  getFeePayments: publicProcedure
    .input(z.object({ admissionId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.feePayment.findMany({
        where: { admissionId: input.admissionId },
        orderBy: { paymentDate: "desc" },
      });
    }),

  // ============ CALENDAR / YEAR MASTER ============
  getCalendarEvents: publicProcedure
    .input(
      z.object({
        month: z.number().optional(),
        year: z.number().optional(),
        eventType: z.string().optional(),
        academicYear: z.string().optional(),
        branchId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input.eventType) where.eventType = input.eventType;
      if (input.academicYear) where.academicYear = input.academicYear;
      if (input.branchId) where.branchId = input.branchId;

      if (input.month !== undefined && input.year !== undefined) {
        const start = new Date(input.year, input.month, 1);
        const end = new Date(input.year, input.month + 1, 0, 23, 59, 59);
        where.date = { gte: start, lte: end };
      }

      return ctx.db.calendarEvent.findMany({
        where,
        orderBy: { date: "asc" },
        include: { branch: { select: { name: true } } },
      });
    }),

  createCalendarEvent: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        date: z.string(),
        endDate: z.string().optional(),
        eventType: z.enum(["HOLIDAY", "EXAM", "MEETING", "FUNCTION", "SPORTS", "VACATION", "OTHER"]).default("HOLIDAY"),
        isRecurring: z.boolean().default(false),
        branchId: z.string().optional(),
        academicYear: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.calendarEvent.create({
        data: {
          ...input,
          date: new Date(input.date),
          endDate: input.endDate ? new Date(input.endDate) : undefined,
        },
      });
    }),

  updateCalendarEvent: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        date: z.string().optional(),
        endDate: z.string().optional(),
        eventType: z.enum(["HOLIDAY", "EXAM", "MEETING", "FUNCTION", "SPORTS", "VACATION", "OTHER"]).optional(),
        academicYear: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.calendarEvent.update({
        where: { id },
        data: {
          ...data,
          date: data.date ? new Date(data.date) : undefined,
          endDate: data.endDate ? new Date(data.endDate) : undefined,
        },
      });
    }),

  deleteCalendarEvent: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.calendarEvent.delete({ where: { id: input.id } });
    }),

  // ============ DOCUMENT MASTER ============
  getDocumentTypes: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.documentType.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { documents: true } } },
    });
  }),

  createDocumentType: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        isRequired: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.documentType.create({ data: input });
    }),

  deleteDocumentType: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.documentType.delete({ where: { id: input.id } });
    }),

  getStudentDocuments: publicProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
        search: z.string().optional(),
        documentTypeId: z.string().optional(),
        branchId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, documentTypeId, branchId } = input;
      const skip = (page - 1) * limit;
      const where: any = {};

      if (documentTypeId) where.documentTypeId = documentTypeId;
      if (branchId) where.branchId = branchId;
      if (search) {
        where.OR = [
          { studentName: { contains: search, mode: "insensitive" } },
          { admissionNumber: { contains: search, mode: "insensitive" } },
        ];
      }

      const [documents, total] = await Promise.all([
        ctx.db.studentDocument.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            documentType: { select: { name: true } },
            branch: { select: { name: true } },
          },
        }),
        ctx.db.studentDocument.count({ where }),
      ]);

      return { documents, total, pages: Math.ceil(total / limit) };
    }),

  createStudentDocument: publicProcedure
    .input(
      z.object({
        studentName: z.string().min(1),
        admissionNumber: z.string().optional(),
        documentTypeId: z.string(),
        fileName: z.string(),
        fileUrl: z.string(),
        fileKey: z.string().optional(),
        remarks: z.string().optional(),
        branchId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.studentDocument.create({ data: input });
    }),

  verifyDocument: publicProcedure
    .input(z.object({ id: z.string(), isVerified: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.studentDocument.update({
        where: { id: input.id },
        data: {
          isVerified: input.isVerified,
          verifiedAt: input.isVerified ? new Date() : null,
        },
      });
    }),

  deleteStudentDocument: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.studentDocument.delete({ where: { id: input.id } });
    }),

  // ============ SCHOOL BRANCHES ============
  getBranches: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.schoolBranch.findMany({
      orderBy: [{ isMain: "desc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            inquiries: true,
            admissions: true,
            studentDocuments: true,
          },
        },
      },
    });
  }),

  createBranch: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        principalName: z.string().optional(),
        isMain: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.schoolBranch.create({ data: input });
    }),

  updateBranch: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        principalName: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.schoolBranch.update({ where: { id }, data });
    }),

  deleteBranch: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.schoolBranch.delete({ where: { id: input.id } });
    }),
});
