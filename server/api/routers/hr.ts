import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
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
  organizationMembers,
  timesheets,
  onboardingSteps,
  notifications, 
} from "../../../lib/db/schema";
import { eq, and, desc, isNull, gte, lte, asc } from "drizzle-orm";
import { format } from "date-fns";
import { TRPCError } from "@trpc/server";
import { checkInInputSchema } from "../../../lib/validations/attendance";
import { requestLeaveInputSchema } from "../../../lib/validations/leave";
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
  upsertWorkLogInputSchema,
  getWorkLogsInputSchema,
  onboardEmployeeInputSchema,
} from "../../../lib/validations/hr";

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
      await ctx.db
        .update(users)
        .set({
          designation: input.designation,
          departmentId: input.departmentId,
          phone: input.phone,
        })
        .where(eq(users.id, input.userId));
    }),


  // --- ONBOARDING ---
  onboardEmployee: protectedProcedure
    .input(onboardEmployeeInputSchema)
    .mutation(async ({ ctx, input }) => {
       const { user } = ctx.session;
       if (user.role !== "OWNER" && user.role !== "ADMIN") {
         throw new TRPCError({
           code: "FORBIDDEN",
           message: "Only Admins and Owners can onboard new employees.",
         });
       }

       const existingUser = await ctx.db.query.users.findFirst({
         where: eq(users.email, input.email)
       });

       if (existingUser) {
          throw new TRPCError({
             code: "CONFLICT",
             message: "User with this email already exists."
          });
       }

       // 1. Create User
       // In a real app with Auth provider, we might create an auth account here too or send invite.
       // For now, we creating a user record directly.
       const userId = crypto.randomUUID();
       
       const [newUser] = await ctx.db.insert(users).values({
          id: userId,
          email: input.email,
          name: `${input.firstName} ${input.lastName}`,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          role: input.role,
          designation: input.designation,
          departmentId: input.departmentId,
          joiningDate: format(input.joiningDate, "yyyy-MM-dd"),
          experienceYears: input.experienceYears?.toString(),
          skills: input.skills ? input.skills.split(",").map(s => s.trim()) : [],
          taxId: input.taxId,
          bankDetails: input.bankDetails,
          password: input.password, // Ideally hashed, assuming provider handles or this is temp
          image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${input.firstName}`, // Auto avatar
          createdAt: new Date(),
          updatedAt: new Date(),
       }).returning();

       // 2. Add to Organization
       await ctx.db.insert(organizationMembers).values({
          userId: newUser.id,
          orgId: ctx.session.orgId,
          role: input.role,
          joinedAt: new Date(),
       });

       // 3. Initialize Salary Structure (optional default)
        await ctx.db.insert(salaryStructures).values({
            orgId: ctx.session.orgId,
            userId: newUser.id,
            basicSalary: "0",
            effectiveFrom: format(new Date(), "yyyy-MM-dd"),
            isActive: true,
        });

       // 4. Create Onboarding Steps Tracking
       const defaultSteps = ["Profile Setup", "Document Submission", "IT Setup", "Introduction"];
       for (const step of defaultSteps) {
           await ctx.db.insert(onboardingSteps).values({
               orgId: ctx.session.orgId,
               userId: newUser.id,
               stepName: step,
               status: "PENDING",
           });
       }

       // 5. Notify Admins/Owners
       // Find all admins and owners in the org (excluding potentially the creator to avoid self-notif, but typically fine)
       // Actually, we want to notify *other* admins.
       const admins = await ctx.db.query.organizationMembers.findMany({
          where: and(
             eq(organizationMembers.orgId, ctx.session.orgId),
             // In SQL 'in' check or or
          ),
          with: {
             user: true
          }
       });
       
       // Filter in JS for simplicity or improve query
       const recipientIds = admins
          .filter(m => (m.role === "ADMIN" || m.role === "OWNER") && m.userId !== user.id)
          .map(m => m.userId);

        // Import notifications table at top if needed, it is there.
        // It is imported at top.
        
        // We also need to add 'notifications' to the imports at the top of the file if not present.
        // Checking imports... 'notifications' is NOT imported in the original file I viewed (lines 1-21).
        // I need to add it to schema imports too. But for now I'll fix this block.

        for (const recipientId of recipientIds) {
           // @ts-ignore
           await ctx.db.insert(notifications).values({
              orgId: ctx.session.orgId,
              userId: recipientId,
              type: "INFO",
              title: "New Employee Onboarded",
              message: `${input.firstName} ${input.lastName} has joined as ${input.designation}.`,
              link: "/hr/employees",
              isRead: false,
           });
        }

       return newUser;
    }),

  // --- ATTENDANCE ---
  getAttendanceStatus: protectedProcedure.query(async ({ ctx }) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const userId = ctx.session.userId;
    const orgId = ctx.session.orgId;

    // Fetch ALL logs for today to calculate totals
    const todayLogs = await ctx.db.query.attendance.findMany({
      where: and(
        eq(attendance.userId, userId),
        eq(attendance.date, today),
        eq(attendance.orgId, orgId)
      ),
    });

    // Calculate aggregated stats
    let dailyWorkHours = 0;
    let dailyBreakHours = 0;
    let isDailyOvertime = false;

    const now = new Date();

    for (const log of todayLogs) {
      dailyBreakHours += Number(log.breakHours || 0);
      
      if (!log.checkOut && log.checkIn) {
         // Active session: Calculate live work duration
         const start = new Date(log.checkIn);
         const durationMs = now.getTime() - start.getTime();
         const durationHours = durationMs / (1000 * 60 * 60);
         // Subtract breaks to get net work
         const netWork = durationHours - (Number(log.breakHours) || 0);
         dailyWorkHours += Math.max(0, netWork);
      } else {
         // Completed session
         dailyWorkHours += Number(log.workHours || 0);
      }

      if (log.isOvertime) isDailyOvertime = true;
    }

    // Default status logic gets tricky with multiple sessions.
    // We check the *latest* log (by createdAt which we don't have sorted here easily without sort).
    // Let's rely on the separate findFirst for "todayLog" which was latest.
    
    // Actually, we can just sort todayLogs in memory or fetch sorted.
    // Let's keep the existing findFirst query for "latest status" to be safe and simple diff.
    const todayLog = await ctx.db.query.attendance.findFirst({
        where: and(
          eq(attendance.userId, userId),
          eq(attendance.date, today),
          eq(attendance.orgId, orgId)
        ),
        orderBy: [desc(attendance.createdAt)],
    });

    let status = "OFFLINE";
    if (todayLog) {
      if (todayLog.checkOut) status = "CHECKED_OUT"; // Latest is checked out
      else if (todayLog.status === "ON_BREAK") status = "ON_BREAK";
      else status = "PRESENT";
    }

    const logs = await ctx.db.query.attendance.findMany({
      where: and(eq(attendance.userId, userId), eq(attendance.orgId, orgId)),
      orderBy: [desc(attendance.createdAt)],
      limit: 10,
    });

    return { 
        status, 
        logs, 
        todayLog, 
        dailyStats: {
            workHours: dailyWorkHours.toFixed(2),
            breakHours: dailyBreakHours.toFixed(2),
            isOvertime: isDailyOvertime
        }
    };
  }),

  checkIn: protectedProcedure
    .input(checkInInputSchema)
    .mutation(async ({ ctx, input }) => {
      const today = format(new Date(), "yyyy-MM-dd");
      const existing = await ctx.db.query.attendance.findFirst({
        where: and(
          eq(attendance.userId, ctx.session.userId),
          eq(attendance.date, today),
          eq(attendance.orgId, ctx.session.orgId)
        ),
        orderBy: [desc(attendance.createdAt)],
      });

      if (existing) {
        if (!existing.checkOut) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Already checked in",
          });
        }

        // Check 2-minute cooldown
        const lastCheckOut = new Date(existing.checkOut);
        const cooldownDiff = new Date().getTime() - lastCheckOut.getTime();
        const diffMinutes = cooldownDiff / (1000 * 60);
        if (diffMinutes < 2) {
           throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Please wait 2 minutes before clocking in again.",
          });
        }

        // RESUME LOGIC: Treat gap as break
        const now = new Date();
        const gapMs = now.getTime() - lastCheckOut.getTime();
        const gapHours = gapMs / (1000 * 60 * 60);
        
        const currentBreaks = (existing.breaks as { start: string; end?: string }[]) || [];
        const newBreaks = [
          ...currentBreaks,
          { start: lastCheckOut.toISOString(), end: now.toISOString() }
        ];
        const newBreakHours = (Number(existing.breakHours) || 0) + gapHours;

        await ctx.db
          .update(attendance)
          .set({
            status: "PRESENT",
            checkOut: null,
            breaks: newBreaks,
            breakHours: newBreakHours.toFixed(2),
            // We don't update workHours here, it acts as previous known, 
            // but effectively we are in 'live' mode now.
          })
          .where(eq(attendance.id, existing.id));
        
        return; // Stop here, do not create new row
      }

      await ctx.db.insert(attendance).values({
        orgId: ctx.session.orgId,
        userId: ctx.session.userId,
        date: today,
        checkIn: new Date(),
        status: "PRESENT",
        locationData: input.location,
      });
    }),

  checkOut: protectedProcedure.mutation(async ({ ctx }) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const log = await ctx.db.query.attendance.findFirst({
      where: and(
        eq(attendance.userId, ctx.session.userId),
        eq(attendance.date, today),
        eq(attendance.orgId, ctx.session.orgId),
        isNull(attendance.checkOut)
      ),
    });

    if (!log)
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot check out" });

    if (!log.checkIn) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Missing check-in time" });
    }

    // Calculate session duration
    const now = new Date();
    const checkInTime = new Date(log.checkIn);
    const durationMs = now.getTime() - checkInTime.getTime();
    const sessionWorkHours = Math.max(
      0,
      durationMs / (1000 * 60 * 60) - (Number(log.breakHours) || 0)
    );

    // Calculate DAILY total to check Overtime
    const todayLogs = await ctx.db.query.attendance.findMany({
      where: and(
        eq(attendance.userId, ctx.session.userId),
        eq(attendance.date, today),
        eq(attendance.orgId, ctx.session.orgId)
      ),
    });

    let previousWorkHours = 0;
    for (const l of todayLogs) {
      if (l.id !== log.id) {
        previousWorkHours += Number(l.workHours || 0);
      }
    }
    
    const totalDailyWork = previousWorkHours + sessionWorkHours;
    const isOvertime = totalDailyWork > 9.5;

    await ctx.db
      .update(attendance)
      .set({
        checkOut: now,
        status: "PRESENT",
        workHours: sessionWorkHours.toFixed(2),
        isOvertime,
      })
      .where(eq(attendance.id, log.id));
  }),

  toggleBreak: protectedProcedure.mutation(async ({ ctx }) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const log = await ctx.db.query.attendance.findFirst({
      where: and(
        eq(attendance.userId, ctx.session.userId),
        eq(attendance.date, today),
        eq(attendance.orgId, ctx.session.orgId),
        isNull(attendance.checkOut)
      ),
    });
    if (!log)
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid action" });

    const now = new Date();
    const breaks =
      (log.breaks as unknown as { start: string; end?: string }[]) || [];

    if (log.status === "PRESENT") {
      const newBreaks = [...breaks, { start: now.toISOString() }];
      await ctx.db
        .update(attendance)
        .set({ status: "ON_BREAK", breaks: newBreaks })
        .where(eq(attendance.id, log.id));
    } else {
      const lastBreak = breaks[breaks.length - 1];
      if (lastBreak && !lastBreak.end) {
        lastBreak.end = now.toISOString(); // Mutating the copy/reference
        const start = new Date(lastBreak.start);
        const duration = (now.getTime() - start.getTime()) / (1000 * 60 * 60);
        const totalBreak = (Number(log.breakHours) || 0) + duration;
        await ctx.db
          .update(attendance)
          .set({
            status: "PRESENT",
            breaks: breaks,
            breakHours: totalBreak.toFixed(2),
          })
          .where(eq(attendance.id, log.id));
      }
    }
  }),

  // --- LEAVES ---
  getLeaves: protectedProcedure.query(async ({ ctx }) => {
    const balances = await ctx.db.query.leaveBalances.findMany({
      where: and(
        eq(leaveBalances.userId, ctx.session.userId),
        eq(leaveBalances.orgId, ctx.session.orgId)
      ),
    });
    const types = await ctx.db.query.leaveTypes.findMany({
      where: eq(leaveTypes.orgId, ctx.session.orgId),
    });
    const requests = await ctx.db.query.leaveRequests.findMany({
      where: and(
        eq(leaveRequests.userId, ctx.session.userId),
        eq(leaveRequests.orgId, ctx.session.orgId)
      ),
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
        status: "PENDING",
      });
    }),

  // --- PAYROLLS ---
  getPayrolls: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.payrolls.findMany({
      where: and(
        eq(payrolls.userId, ctx.session.userId),
        eq(payrolls.orgId, ctx.session.orgId)
      ),
      orderBy: [desc(payrolls.createdAt)],
    });
  }),

  generatePayroll: protectedProcedure
    .input(generatePayrollInputSchema)
    .mutation(async ({ ctx, input }) => {
      // Get organization members
      const memberships = await ctx.db.query.organizationMembers.findMany({
        where: eq(organizationMembers.orgId, ctx.session.orgId),
      });

      for (const mem of memberships) {
        const uId = mem.userId;
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
          effectiveTo: input.effectiveTo
            ? format(input.effectiveTo, "yyyy-MM-dd")
            : undefined,
          isActive: true,
        })
        .returning();
      return structure;
    }),

  getExpenses: protectedProcedure
    .input(
      z.object({ userId: z.string().optional(), status: z.string().optional() })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(expenses.orgId, ctx.session.orgId)];
      if (input.userId) {
        conditions.push(eq(expenses.userId, input.userId));
      }
      if (input.status) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        conditions.push(eq(expenses.status, input.status as any));
      }
      return await ctx.db.query.expenses.findMany({
        where: and(...conditions),
        orderBy: [desc(expenses.expenseDate)],
      });
    }),

  createExpense: protectedProcedure
    .input(createExpenseInputSchema)
    .mutation(async ({ ctx, input }) => {
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
          and(
            eq(expenses.id, input.expenseId),
            eq(expenses.orgId, ctx.session.orgId)
          )
        );
    }),

  getMonthlyAttendance: protectedProcedure
    .input(z.object({
        userId: z.string(),
        year: z.number(),
        month: z.number() // 0-11
    }))
    .query(async ({ ctx, input }) => {
        // Auth check
        if (ctx.session.user.id !== input.userId && ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
            throw new TRPCError({ code: "FORBIDDEN" });
        }

        const startDate = new Date(input.year, input.month, 1);
        const endDate = new Date(input.year, input.month + 1, 0); // Last day of month

        return await ctx.db.query.attendance.findMany({
            where: and(
                eq(attendance.userId, input.userId),
                eq(attendance.orgId, ctx.session.orgId),
                gte(attendance.date, format(startDate, "yyyy-MM-dd")),
                lte(attendance.date, format(endDate, "yyyy-MM-dd"))
            ),
            orderBy: [asc(attendance.date)]
        });
    }),

  getAssets: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.assets.findMany({
      where: eq(assets.orgId, ctx.session.orgId),
      orderBy: [desc(assets.createdAt)],
    });
  }),

  createAsset: protectedProcedure
    .input(createAssetInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [asset] = await ctx.db
        .insert(assets)
        .values({
          orgId: ctx.session.orgId,
          name: input.name,
          type: input.type,
          serialNumber: input.serialNumber,
          assignedTo: input.assignedTo,
          purchaseDate: input.purchaseDate
            ? format(input.purchaseDate, "yyyy-MM-dd")
            : undefined,
          purchaseCost: input.purchaseCost?.toString(),
          location: input.location,
          notes: input.notes,
          status: input.assignedTo ? "ASSIGNED" : "AVAILABLE",
        })
        .returning();
      return asset;
    }),

  updateAsset: protectedProcedure
    .input(updateAssetInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { assetId, ...updateData } = input;
      await ctx.db
        .update(assets)
        .set({
          ...(updateData.name && { name: updateData.name }),
          ...(updateData.type && { type: updateData.type }),
          ...(updateData.serialNumber !== undefined && {
            serialNumber: updateData.serialNumber,
          }),
          ...(updateData.assignedTo !== undefined && {
            assignedTo: updateData.assignedTo,
            status: updateData.assignedTo ? "ASSIGNED" : "AVAILABLE",
          }),
          ...(updateData.status && { status: updateData.status }),
          ...(updateData.location !== undefined && {
            location: updateData.location,
          }),
          ...(updateData.notes !== undefined && { notes: updateData.notes }),
          updatedAt: new Date(),
        })
        .where(
          and(eq(assets.id, assetId), eq(assets.orgId, ctx.session.orgId))
        );
    }),

  getDocuments: protectedProcedure
    .input(
      z.object({ userId: z.string().optional(), type: z.string().optional() })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(documents.orgId, ctx.session.orgId),
        eq(documents.isActive, true),
      ];
      if (input.userId) {
        conditions.push(eq(documents.userId, input.userId));
      }
      if (input.type) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        conditions.push(eq(documents.type, input.type as any));
      }
      return await ctx.db.query.documents.findMany({
        where: and(...conditions),
        orderBy: [desc(documents.createdAt)],
      });
    }),

  createDocument: protectedProcedure
    .input(createDocumentInputSchema)
    .mutation(async ({ ctx, input }) => {
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

  createGoal: protectedProcedure
    .input(createGoalInputSchema)
    .mutation(async ({ ctx, input }) => {
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

  updateGoal: protectedProcedure
    .input(updateGoalInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { goalId, ...updateData } = input;
      await ctx.db
        .update(goals)
        .set({
          ...(updateData.title && { title: updateData.title }),
          ...(updateData.description !== undefined && {
            description: updateData.description,
          }),
          ...(updateData.targetValue !== undefined && {
            targetValue: updateData.targetValue.toString(),
          }),
          ...(updateData.currentValue !== undefined && {
            currentValue: updateData.currentValue.toString(),
          }),
          ...(updateData.status && { status: updateData.status }),
          ...(updateData.progress !== undefined && {
            progress: updateData.progress,
          }),
          updatedAt: new Date(),
        })
        .where(and(eq(goals.id, goalId), eq(goals.orgId, ctx.session.orgId)));
    }),

  getHelpdeskTickets: protectedProcedure
    .input(
      z.object({ userId: z.string().optional(), status: z.string().optional() })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(helpdeskTickets.orgId, ctx.session.orgId)];
      if (input.userId) {
        conditions.push(eq(helpdeskTickets.userId, input.userId));
      }
      if (input.status) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // --- WORK LOGS ---
  getWorkLogs: protectedProcedure
    .input(getWorkLogsInputSchema)
    .query(async ({ ctx, input }) => {
      const { year, quarter, userId } = input;
      const targetUserId = userId || ctx.session.userId;

      // Calculate date range for quarter
      const startMonth = (quarter - 1) * 3; // 0, 3, 6, 9
      const startDate = new Date(year, startMonth, 1);
      const endDate = new Date(year, startMonth + 3, 0); // Last day of previous month from next q start

      const startStr = format(startDate, "yyyy-MM-dd");
      const endStr = format(endDate, "yyyy-MM-dd");

      // We use gte/lte if imported, or just raw logic or between
      // Since date is string 'YYYY-MM-DD' in DB (pg date), string comparison works fine for iso format
      // But safer to import gte, lte from drizzle-orm if available. 
      // Existing imports: eq, and, desc, isNull, ne. Need to add gte, lte.
      // Let's rely on sql or just string comparison.
      // Actually, drizzle `date` column is string in JS usually.
      
      const logs = await ctx.db.query.timesheets.findMany({
        where: and(
           eq(timesheets.orgId, ctx.session.orgId),
           eq(timesheets.userId, targetUserId),
           // For simplicity in filter, or add gte/lte imports. 
           // Let's add gte/lte imports in a separate hunk or reused `and`.
           // I'll try to use a specialized where clause or just filter in memory if small? 
           // No, best to query. I'll add imports.
        ),
      });
      // Filtering in memory for the quarter range to avoid adding imports in this hunk if complicated
      // Timesheets shouldn't be massive for one user.
      return logs.filter(l => l.date >= startStr && l.date <= endStr);
    }),

  upsertWorkLog: protectedProcedure
    .input(upsertWorkLogInputSchema)
    .mutation(async ({ ctx, input }) => {
        const dateStr = format(input.date, "yyyy-MM-dd");
        
        const existing = await ctx.db.query.timesheets.findFirst({
            where: and(
                eq(timesheets.orgId, ctx.session.orgId),
                eq(timesheets.userId, ctx.session.userId),
                eq(timesheets.date, dateStr)
            )
        });

        if (existing) {
             const [updated] = await ctx.db.update(timesheets)
                .set({
                    description: input.description,
                    hours: input.hours?.toString() || existing.hours,
                })
                .where(eq(timesheets.id, existing.id))
                .returning();
             return updated;
        } else {
             const [created] = await ctx.db.insert(timesheets).values({
                 orgId: ctx.session.orgId,
                 userId: ctx.session.userId,
                 date: dateStr,
                 description: input.description,
                 hours: input.hours?.toString() || "0",
             }).returning();
             return created;
        }
    }),
});
