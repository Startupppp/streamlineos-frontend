import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  departments,
  users,
  attendance,
  leaveRequests,
  leaveBalances,
  leaveTypes,
  payrolls,
  salaryStructures,
  expenses,
  assets,
  documents,
  performanceReviews,
  goals,
  helpdeskTickets,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { format } from "date-fns";
import { TRPCError } from "@trpc/server";
import { checkInInputSchema } from "@/lib/validations/attendance";
import { requestLeaveInputSchema } from "@/lib/validations/leave";
import {
  createDepartmentInputSchema,
  updateProfileInputSchema,
  generatePayrollInputSchema,
  createSalaryStructureInputSchema,
  createExpenseInputSchema,
  updateExpenseStatusInputSchema,
  createAssetInputSchema,
  updateAssetInputSchema,
  createDocumentInputSchema,
  createPerformanceReviewInputSchema,
  createGoalInputSchema,
  updateGoalInputSchema,
} from "@/lib/validations/hr";

export const hrRouter = createTRPCRouter({
  // --- DEPARTMENTS & EMPLOYEES ---
  getDepartments: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.departments.findMany({
      where: eq(departments.orgId, ctx.session.orgId),
    });
  }),

  createDepartment: protectedProcedure
    .input(createDepartmentInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(departments).values({
        name: input.name,
        orgId: ctx.session.orgId,
      });
    }),

  updateProfile: protectedProcedure
    .input(updateProfileInputSchema)
    .mutation(async ({ ctx, input }) => {
       await ctx.db.update(users)
        .set({
            designation: input.designation,
            departmentId: input.departmentId,
            phone: input.phone
        })
        .where(eq(users.id, input.userId));
    }),

  // --- ATTENDANCE ---
  getAttendanceStatus: protectedProcedure.query(async ({ ctx }) => {
      const today = format(new Date(), "yyyy-MM-dd");
      const userId = ctx.session.userId;
      const orgId = ctx.session.orgId;

      const todayLog = await ctx.db.query.attendance.findFirst({
        where: and(eq(attendance.userId, userId), eq(attendance.date, today), eq(attendance.orgId, orgId)),
      });

      const logs = await ctx.db.query.attendance.findMany({
        where: and(eq(attendance.userId, userId), eq(attendance.orgId, orgId)),
        orderBy: [desc(attendance.date)],
        limit: 10,
      });

      let status = "OFFLINE";
      if (todayLog) {
        if (todayLog.checkOut) status = "CHECKED_OUT";
        else if (todayLog.status === "ON_BREAK") status = "ON_BREAK";
        else status = "PRESENT";
      }

      return { status, logs, todayLog };
  }),

  checkIn: protectedProcedure
    .input(checkInInputSchema)
    .mutation(async ({ ctx, input }) => {
        const today = format(new Date(), "yyyy-MM-dd");
        const existing = await ctx.db.query.attendance.findFirst({
            where: and(eq(attendance.userId, ctx.session.userId), eq(attendance.date, today), eq(attendance.orgId, ctx.session.orgId)),
        });
        if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Already checked in" });

        await ctx.db.insert(attendance).values({
            orgId: ctx.session.orgId,
            userId: ctx.session.userId,
            date: today,
            checkIn: new Date(),
            status: "PRESENT",
            locationData: input.location
        });
    }),
    
  checkOut: protectedProcedure.mutation(async ({ ctx }) => {
      const today = format(new Date(), "yyyy-MM-dd");
      const log = await ctx.db.query.attendance.findFirst({
        where: and(eq(attendance.userId, ctx.session.userId), eq(attendance.date, today), eq(attendance.orgId, ctx.session.orgId)),
      });

      if (!log || log.checkOut) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot check out" });

      const now = new Date();
      const checkInTime = new Date(log.checkIn!);
      const durationMs = now.getTime() - checkInTime.getTime();
      const workHours = (durationMs / (1000 * 60 * 60)) - (Number(log.breakHours) || 0);
      const isOvertime = workHours > 9;

      await ctx.db.update(attendance)
        .set({ checkOut: now, status: "PRESENT", workHours: workHours.toFixed(2), isOvertime })
        .where(eq(attendance.id, log.id));
  }),

  toggleBreak: protectedProcedure.mutation(async ({ ctx }) => {
      const today = format(new Date(), "yyyy-MM-dd");
      const log = await ctx.db.query.attendance.findFirst({
        where: and(eq(attendance.userId, ctx.session.userId), eq(attendance.date, today), eq(attendance.orgId, ctx.session.orgId)),
      });
      if (!log || log.checkOut) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid action" });

      const now = new Date();
      const breaks = (log.breaks as unknown as { start: string; end?: string }[]) || [];

      if (log.status === "PRESENT") {
          const newBreaks = [...breaks, { start: now.toISOString() }];
          await ctx.db.update(attendance).set({ status: "ON_BREAK", breaks: newBreaks }).where(eq(attendance.id, log.id));
      } else {
          const lastBreak = breaks[breaks.length - 1];
          if (lastBreak && !lastBreak.end) {
              lastBreak.end = now.toISOString(); // Mutating the copy/reference
              const start = new Date(lastBreak.start);
              const duration = (now.getTime() - start.getTime()) / (1000 * 60 * 60);
              const totalBreak = (Number(log.breakHours) || 0) + duration;
              await ctx.db.update(attendance).set({ status: "PRESENT", breaks: breaks, breakHours: totalBreak.toFixed(2) }).where(eq(attendance.id, log.id));
          }
      }
  }),

  // --- LEAVES ---
  getLeaves: protectedProcedure.query(async ({ ctx }) => {
      const balances = await ctx.db.query.leaveBalances.findMany({
        where: and(eq(leaveBalances.userId, ctx.session.userId), eq(leaveBalances.orgId, ctx.session.orgId)),
      });
      const types = await ctx.db.query.leaveTypes.findMany({ where: eq(leaveTypes.orgId, ctx.session.orgId) });
      const requests = await ctx.db.query.leaveRequests.findMany({
        where: and(eq(leaveRequests.userId, ctx.session.userId), eq(leaveRequests.orgId, ctx.session.orgId)),
        orderBy: [desc(leaveRequests.createdAt)],
      });
      return { balances, types, requests };
  }),

  requestLeave: protectedProcedure
    .input(requestLeaveInputSchema)
    .mutation(async ({ ctx, input }) => {
        await ctx.db.insert(leaveRequests).values({
            orgId: ctx.session.orgId,
            userId: ctx.session.userId,
            leaveTypeId: input.typeId,
            startDate: format(input.startDate, "yyyy-MM-dd"),
            endDate: format(input.endDate, "yyyy-MM-dd"),
            reason: input.reason,
            status: "PENDING"
        });
    }),

  // --- PAYROLLS ---
  getPayrolls: protectedProcedure.query(async ({ ctx }) => {
      return await ctx.db.query.payrolls.findMany({
        where: and(eq(payrolls.userId, ctx.session.userId), eq(payrolls.orgId, ctx.session.orgId)),
        orderBy: [desc(payrolls.createdAt)]
      });
  }),

  generatePayroll: protectedProcedure
    .input(generatePayrollInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const client = await clerkClient();
      const memberships = await client.organizations.getOrganizationMembershipList({
        organizationId: ctx.session.orgId,
      });

      for (const mem of memberships.data) {
        const uId = mem.publicUserData?.userId;
        if (!uId) continue;

        const salaryStructure = await ctx.db.query.salaryStructures.findFirst({
          where: and(
            eq(salaryStructures.userId, uId),
            eq(salaryStructures.orgId, ctx.session.orgId),
            eq(salaryStructures.isActive, true)
          ),
        });

        const basic = salaryStructure
          ? parseFloat(salaryStructure.basicSalary)
          : 50000;
        const hraPercentage = salaryStructure
          ? parseFloat(salaryStructure.hraPercentage || "40")
          : 40;
        const hra = basic * (hraPercentage / 100);
        const allowances = salaryStructure
          ? parseFloat(salaryStructure.allowances || "0")
          : 5000;
        const deductions = salaryStructure
          ? parseFloat(salaryStructure.deductions || "0")
          : 2000;
        const gross = basic + hra + allowances;
        const net = gross - deductions;

        const existing = await ctx.db.query.payrolls.findFirst({
          where: and(
            eq(payrolls.userId, uId),
            eq(payrolls.month, input.month),
            eq(payrolls.orgId, ctx.session.orgId)
          ),
        });

        if (!existing) {
          await ctx.db.insert(payrolls).values({
            orgId: ctx.session.orgId,
            userId: uId,
            month: input.month,
            basicSalary: basic.toString(),
            hra: hra.toString(),
            allowances: allowances.toString(),
            deductions: deductions.toString(),
            grossSalary: gross.toString(),
            netSalary: net.toString(),
            status: "DRAFT",
            generatedBy: ctx.session.userId,
          });
        }
      }
    }),

  getSalaryStructures: protectedProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(salaryStructures.orgId, ctx.session.orgId)];
      if (input.userId) {
        conditions.push(eq(salaryStructures.userId, input.userId));
      }
      return await ctx.db.query.salaryStructures.findMany({
        where: and(...conditions),
        orderBy: [desc(salaryStructures.effectiveFrom)],
      });
    }),

  createSalaryStructure: protectedProcedure
    .input(createSalaryStructureInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(salaryStructures)
        .set({ isActive: false })
        .where(
          and(
            eq(salaryStructures.userId, input.userId),
            eq(salaryStructures.orgId, ctx.session.orgId),
            eq(salaryStructures.isActive, true)
          )
        );

      const [structure] = await ctx.db
        .insert(salaryStructures)
        .values({
          orgId: ctx.session.orgId,
          userId: input.userId,
          basicSalary: input.basicSalary.toString(),
          hraPercentage: input.hraPercentage.toString(),
          allowances: input.allowances.toString(),
          deductions: input.deductions.toString(),
          effectiveFrom: format(input.effectiveFrom, "yyyy-MM-dd"),
          effectiveTo: input.effectiveTo ? format(input.effectiveTo, "yyyy-MM-dd") : undefined,
          isActive: true,
        })
        .returning();
      return structure;
    }),

  getExpenses: protectedProcedure
    .input(z.object({ userId: z.string().optional(), status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(expenses.orgId, ctx.session.orgId)];
      if (input.userId) {
        conditions.push(eq(expenses.userId, input.userId));
      }
      if (input.status) {
        conditions.push(eq(expenses.status, input.status as any));
      }
      return await ctx.db.query.expenses.findMany({
        where: and(...conditions),
        orderBy: [desc(expenses.expenseDate)],
      });
    }),

  createExpense: protectedProcedure.input(createExpenseInputSchema).mutation(async ({ ctx, input }) => {
    const [expense] = await ctx.db
      .insert(expenses)
      .values({
        orgId: ctx.session.orgId,
        userId: ctx.session.userId,
        category: input.category,
        amount: input.amount.toString(),
        description: input.description,
        receiptUrl: input.receiptUrl,
        expenseDate: format(input.expenseDate, "yyyy-MM-dd"),
        status: "PENDING",
      })
      .returning();
    return expense;
  }),

  updateExpenseStatus: protectedProcedure
    .input(updateExpenseStatusInputSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(expenses)
        .set({
          status: input.status,
          approverId: ctx.session.userId,
          rejectionReason: input.rejectionReason,
        })
        .where(
          and(eq(expenses.id, input.expenseId), eq(expenses.orgId, ctx.session.orgId))
        );
    }),

  getAssets: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.assets.findMany({
      where: eq(assets.orgId, ctx.session.orgId),
      orderBy: [desc(assets.createdAt)],
    });
  }),

  createAsset: protectedProcedure.input(createAssetInputSchema).mutation(async ({ ctx, input }) => {
    const [asset] = await ctx.db
      .insert(assets)
      .values({
        orgId: ctx.session.orgId,
        name: input.name,
        type: input.type,
        serialNumber: input.serialNumber,
        assignedTo: input.assignedTo,
        purchaseDate: input.purchaseDate ? format(input.purchaseDate, "yyyy-MM-dd") : undefined,
        purchaseCost: input.purchaseCost?.toString(),
        location: input.location,
        notes: input.notes,
        status: input.assignedTo ? "ASSIGNED" : "AVAILABLE",
      })
      .returning();
    return asset;
  }),

  updateAsset: protectedProcedure.input(updateAssetInputSchema).mutation(async ({ ctx, input }) => {
    const { assetId, ...updateData } = input;
    await ctx.db
      .update(assets)
      .set({
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.type && { type: updateData.type }),
        ...(updateData.serialNumber !== undefined && { serialNumber: updateData.serialNumber }),
        ...(updateData.assignedTo !== undefined && {
          assignedTo: updateData.assignedTo,
          status: updateData.assignedTo ? "ASSIGNED" : "AVAILABLE",
        }),
        ...(updateData.status && { status: updateData.status }),
        ...(updateData.location !== undefined && { location: updateData.location }),
        ...(updateData.notes !== undefined && { notes: updateData.notes }),
        updatedAt: new Date(),
      })
      .where(and(eq(assets.id, assetId), eq(assets.orgId, ctx.session.orgId)));
  }),

  getDocuments: protectedProcedure
    .input(z.object({ userId: z.string().optional(), type: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(documents.orgId, ctx.session.orgId), eq(documents.isActive, true)];
      if (input.userId) {
        conditions.push(eq(documents.userId, input.userId));
      }
      if (input.type) {
        conditions.push(eq(documents.type, input.type as any));
      }
      return await ctx.db.query.documents.findMany({
        where: and(...conditions),
        orderBy: [desc(documents.createdAt)],
      });
    }),

  createDocument: protectedProcedure.input(createDocumentInputSchema).mutation(async ({ ctx, input }) => {
    const [document] = await ctx.db
      .insert(documents)
      .values({
        orgId: ctx.session.orgId,
        userId: input.userId || ctx.session.userId,
        name: input.name,
        type: input.type,
        fileUrl: input.fileUrl,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        uploadedBy: ctx.session.userId,
        isActive: true,
      })
      .returning();
    return document;
  }),

  getPerformanceReviews: protectedProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(performanceReviews.orgId, ctx.session.orgId)];
      if (input.userId) {
        conditions.push(eq(performanceReviews.userId, input.userId));
      }
      return await ctx.db.query.performanceReviews.findMany({
        where: and(...conditions),
        orderBy: [desc(performanceReviews.periodEnd)],
      });
    }),

  createPerformanceReview: protectedProcedure
    .input(createPerformanceReviewInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [review] = await ctx.db
        .insert(performanceReviews)
        .values({
          orgId: ctx.session.orgId,
          userId: input.userId,
          reviewerId: input.reviewerId || ctx.session.userId,
          periodStart: format(input.periodStart, "yyyy-MM-dd"),
          periodEnd: format(input.periodEnd, "yyyy-MM-dd"),
          ratings: input.ratings,
          strengths: input.strengths,
          improvements: input.improvements,
          goals: input.goals,
          overallRating: input.overallRating?.toString(),
          comments: input.comments,
          status: "DRAFT",
        })
        .returning();
      return review;
    }),

  getGoals: protectedProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(goals.orgId, ctx.session.orgId)];
      if (input.userId) {
        conditions.push(eq(goals.userId, input.userId));
      }
      return await ctx.db.query.goals.findMany({
        where: and(...conditions),
        orderBy: [desc(goals.createdAt)],
      });
    }),

  createGoal: protectedProcedure.input(createGoalInputSchema).mutation(async ({ ctx, input }) => {
    const [goal] = await ctx.db
      .insert(goals)
      .values({
        orgId: ctx.session.orgId,
        userId: input.userId,
        title: input.title,
        description: input.description,
        type: input.type,
        targetValue: input.targetValue?.toString(),
        currentValue: input.currentValue.toString(),
        unit: input.unit,
        startDate: format(input.startDate, "yyyy-MM-dd"),
        endDate: format(input.endDate, "yyyy-MM-dd"),
        status: "IN_PROGRESS",
        progress: 0,
        parentGoalId: input.parentGoalId,
      })
      .returning();
    return goal;
  }),

  updateGoal: protectedProcedure.input(updateGoalInputSchema).mutation(async ({ ctx, input }) => {
    const { goalId, ...updateData } = input;
    await ctx.db
      .update(goals)
      .set({
        ...(updateData.title && { title: updateData.title }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.targetValue !== undefined && {
          targetValue: updateData.targetValue.toString(),
        }),
        ...(updateData.currentValue !== undefined && {
          currentValue: updateData.currentValue.toString(),
        }),
        ...(updateData.status && { status: updateData.status }),
        ...(updateData.progress !== undefined && { progress: updateData.progress }),
        updatedAt: new Date(),
      })
      .where(and(eq(goals.id, goalId), eq(goals.orgId, ctx.session.orgId)));
  }),

  getHelpdeskTickets: protectedProcedure
    .input(z.object({ userId: z.string().optional(), status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(helpdeskTickets.orgId, ctx.session.orgId)];
      if (input.userId) {
        conditions.push(eq(helpdeskTickets.userId, input.userId));
      }
      if (input.status) {
        conditions.push(eq(helpdeskTickets.status, input.status as any));
      }
      return await ctx.db.query.helpdeskTickets.findMany({
        where: and(...conditions),
        orderBy: [desc(helpdeskTickets.createdAt)],
      });
    }),

  createHelpdeskTicket: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [ticket] = await ctx.db
        .insert(helpdeskTickets)
        .values({
          orgId: ctx.session.orgId,
          userId: ctx.session.userId,
          title: input.title,
          description: input.description,
          category: input.category,
          priority: input.priority || "MEDIUM",
          status: "TODO",
        })
        .returning();
      return ticket;
    }),
});
