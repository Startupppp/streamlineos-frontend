import { z } from "zod";
import { logger } from "../../../lib/logger";
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
  wfhRequests,
  employeeDevices,
  holidays,
} from "../../../lib/db/schema";
import { eq, and, desc, isNull, gte, lte, asc, sql } from "drizzle-orm";
import { format } from "date-fns";
import { formatDateOnly, getTodayString } from "../../../lib/date-utils";
import { ALLOWED_LEAVE_TYPE_NAMES, LEAVE_POLICY } from "../../../lib/leave-policy";
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
  createWfhRequestInputSchema,
  processWfhRequestInputSchema,
  createDeviceInputSchema,
  updateDeviceInputSchema,
  generateEmployeePayslipInputSchema,
} from "../../../lib/validations/hr";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail, sendPayslipGeneratedEmail } from "../../../lib/email";
import { initializeLeaveBalances } from "../../actions/leave-actions";
import {
  createPaginatedResponse,
  getOffset,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "../../../lib/pagination";

export const hrRouter = createTRPCRouter({
  getDepartments: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.departments.findMany({
      where: eq(departments.orgId, ctx.session.orgId),
    });
  }),

  getEmployees: protectedProcedure.query(async ({ ctx }) => {
    const members = await ctx.db.query.organizationMembers.findMany({
      where: eq(organizationMembers.orgId, ctx.session.orgId),
      with: {
        user: true,
      },
    });
    return members.map((m) => m.user).filter((u) => u.isActive !== false);
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
      const targetMember = await ctx.db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, input.userId),
          eq(organizationMembers.orgId, ctx.session.orgId)
        ),
      });
      if (!targetMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User not found in your organization.",
        });
      }
      const isSelf = ctx.session.userId === input.userId;
      const isOwnerOrAdmin = ctx.session.user.role === "OWNER" || ctx.session.user.role === "ADMIN";
      if (!isSelf && !isOwnerOrAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own profile.",
        });
      }

      const updateData: Record<string, unknown> = {};
      if (input.designation !== undefined) updateData.designation = input.designation;
      if (input.departmentId !== undefined) updateData.departmentId = input.departmentId;
      if (input.phone !== undefined) updateData.phone = input.phone;
      if (input.image !== undefined) updateData.image = input.image;

      if (Object.keys(updateData).length > 0) {
        await ctx.db
          .update(users)
          .set(updateData)
          .where(eq(users.id, input.userId));
      }

      return { success: true };
    }),

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

       const userId = crypto.randomUUID();
       
       const rawPassword = input.password || crypto.randomUUID().slice(0, 16);
       const hashedPassword = await bcrypt.hash(rawPassword, 10);

       let finalDepartmentId = input.departmentId;
       if (input.departmentId && input.departmentId < 0) {
          const commonRoleNames: Record<number, string> = {
            [-1]: "Admin",
            [-2]: "HR",
            [-3]: "Sales",
            [-4]: "Customer Support",
            [-5]: "Graphic Designer",
            [-6]: "Digital Marketing",
            [-7]: "Social Media Manager",
            [-8]: "Engineering",
            [-9]: "Product",
            [-10]: "Design",
            [-11]: "Marketing",
            [-12]: "Finance",
            [-13]: "Operations",
          };
          
          const roleName = commonRoleNames[input.departmentId];
          if (roleName) {
            let existingDept = await ctx.db.query.departments.findFirst({
              where: and(
                eq(departments.name, roleName),
                eq(departments.orgId, ctx.session.orgId)
              ),
            });
            
            if (!existingDept) {
              const [newDept] = await ctx.db.insert(departments).values({
                name: roleName,
                orgId: ctx.session.orgId,
              }).returning();
              existingDept = newDept;
            }
            
            finalDepartmentId = existingDept.id;
          }
       }

       const employeeIdPrefix = "VC";
       const yearSuffix = new Date().getFullYear().toString().slice(-2);
       const maxIdResult = await ctx.db.select({
         maxId: sql<string>`COALESCE(MAX(${users.employeeId}), '')`
       }).from(users).where(eq(users.isActive, true));
       const lastId = maxIdResult[0]?.maxId || "";
       const lastNum = parseInt(lastId.replace(/\D/g, "").slice(-3)) || 0;
       const empNumber = lastNum + 1;
       const generatedEmployeeId = `${employeeIdPrefix}${yearSuffix}${empNumber.toString().padStart(3, "0")}`;

       const [newUser] = await ctx.db.insert(users).values({
          id: userId,
          email: input.email,
          name: `${input.firstName} ${input.lastName}`,
          firstName: input.firstName,
          lastName: input.lastName,
          gender: input.gender,
          phone: input.phone,
          whatsappNumber: input.whatsappSameAsPhone ? input.phone : input.whatsappNumber,
          whatsappSameAsPhone: input.whatsappSameAsPhone,
          role: input.role,
          designation: input.designation,
          departmentId: finalDepartmentId,
          joiningDate: formatDateOnly(input.joiningDate),
          experienceYears: input.experienceYears?.toString(),
          skills: input.skills ? input.skills.split(",").map(s => s.trim()) : [],
          taxId: input.taxId,
          bankDetails: input.bankDetails,
          monthlySalary: input.monthlySalary?.toString(),
          employeeId: generatedEmployeeId,
          password: hashedPassword,
          isPasswordChangeRequired: true,
          image: `${process.env.NEXT_PUBLIC_AVATAR_SERVICE_URL || "https://api.dicebear.com/7.x/avataaars/svg"}?seed=${input.firstName}`,
          createdAt: new Date(),
          updatedAt: new Date(),
       }).returning();

       try {
         await sendWelcomeEmail(
            input.email,
            input.firstName,
            rawPassword
         );
       } catch (error) {
         logger.error("Failed to send welcome email", { email: input.email, error });
       }

       await ctx.db.insert(organizationMembers).values({
          userId: newUser.id,
          orgId: ctx.session.orgId,
          role: input.role,
          joinedAt: new Date(),
       });

       const monthlySalary = input.monthlySalary || 0;
       const basicSalary = monthlySalary * 0.5;
       const hra = monthlySalary * 0.25;
       const specialAllowance = monthlySalary * 0.25;
       
        await ctx.db.insert(salaryStructures).values({
            orgId: ctx.session.orgId,
            userId: newUser.id,
            basicSalary: basicSalary.toString(),
            hraPercentage: "50",
            allowances: specialAllowance.toString(),
            deductions: "200",
            effectiveFrom: getTodayString(),
            isActive: true,
        });

       if (monthlySalary > 0) {
         const currentMonth = format(new Date(), "yyyy-MM");
         const grossSalary = basicSalary + hra + specialAllowance;
         const netSalary = grossSalary - 200;
         
         await ctx.db.insert(payrolls).values({
           orgId: ctx.session.orgId,
           userId: newUser.id,
           month: currentMonth,
           basicSalary: basicSalary.toString(),
           hra: hra.toString(),
           allowances: specialAllowance.toString(),
           deductions: "200",
           grossSalary: grossSalary.toString(),
           netSalary: netSalary.toString(),
           status: "DRAFT",
           generatedBy: ctx.session.userId,
         });
       }

       const defaultSteps = ["Profile Setup", "Document Submission", "IT Setup", "Introduction"];
       for (const step of defaultSteps) {
           await ctx.db.insert(onboardingSteps).values({
               orgId: ctx.session.orgId,
               userId: newUser.id,
               stepName: step,
               status: "PENDING",
           });
       }
       await initializeLeaveBalances(
         ctx.session.orgId,
         newUser.id,
         input.joiningDate,
       );

       const admins = await ctx.db.query.organizationMembers.findMany({
          where: and(
             eq(organizationMembers.orgId, ctx.session.orgId),

          ),
          with: {
             user: true
          }
       });
       

       const recipientIds = admins
          .filter(m => (m.role === "ADMIN" || m.role === "OWNER") && m.userId !== user.id)
          .map(m => m.userId);

        for (const recipientId of recipientIds) {

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

  deleteEmployee: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
       const { user } = ctx.session;
       if (user.role !== "OWNER" && user.role !== "ADMIN") {
         throw new TRPCError({
           code: "FORBIDDEN",
           message: "Only Admins and Owners can delete employees.",
         });
       }
       if (input.userId === user.id) {
         throw new TRPCError({
           code: "BAD_REQUEST",
           message: "You cannot delete your own account.",
         });
       }
       const targetMember = await ctx.db.query.organizationMembers.findFirst({
         where: and(
           eq(organizationMembers.userId, input.userId),
           eq(organizationMembers.orgId, ctx.session.orgId)
         ),
       });

       if (!targetMember) {
         throw new TRPCError({
           code: "NOT_FOUND",
           message: "Employee not found in your organization.",
         });
       }

       const targetUser = await ctx.db.query.users.findFirst({
         where: eq(users.id, input.userId),
       });

       if (!targetUser) {
         throw new TRPCError({
           code: "NOT_FOUND",
           message: "User not found.",
         });
       }
       if (user.role === "ADMIN" && (targetUser.role === "ADMIN" || targetUser.role === "OWNER")) {
         throw new TRPCError({
           code: "FORBIDDEN",
           message: "Admins can only delete Member accounts.",
         });
       }
       if (user.role === "OWNER" && targetUser.role === "OWNER") {
         throw new TRPCError({
           code: "FORBIDDEN",
           message: "Cannot delete another Owner account.",
         });
       }

       await ctx.db
         .update(users)
         .set({ isActive: false })
         .where(eq(users.id, input.userId));
       
       return { success: true, message: "Employee deactivated successfully." };
    }),

  getAttendanceStatus: protectedProcedure.query(async ({ ctx }) => {
    const today = getTodayString();
    const userId = ctx.session.userId;
    const orgId = ctx.session.orgId;

    const todayLogs = await ctx.db.query.attendance.findMany({
      where: and(
        eq(attendance.userId, userId),
        eq(attendance.date, today),
        eq(attendance.orgId, orgId)
      ),
    });

    let dailyWorkHours = 0;
    let dailyBreakHours = 0;
    let isDailyOvertime = false;

    const now = new Date();

    for (const log of todayLogs) {
      dailyBreakHours += Number(log.breakHours || 0);
      
      if (!log.checkOut && log.checkIn) {
         const start = new Date(log.checkIn);
         const durationMs = now.getTime() - start.getTime();
         const durationHours = durationMs / (1000 * 60 * 60);
         const netWork = durationHours - (Number(log.breakHours) || 0);
         dailyWorkHours += Math.max(0, netWork);
      } else {
         dailyWorkHours += Number(log.workHours || 0);
      }

      if (log.isOvertime) isDailyOvertime = true;
    }

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
      if (todayLog.checkOut) status = "CHECKED_OUT";
      else if (todayLog.status === "ON_BREAK") status = "ON_BREAK";
      else status = "PRESENT";
    }

    const logs = await ctx.db.query.attendance.findMany({
      where: and(eq(attendance.userId, userId), eq(attendance.orgId, orgId)),
      orderBy: [desc(attendance.createdAt)],
      limit: 10,
    });
    let cooldownRemaining = 0;
    if (status === "CHECKED_OUT" && todayLog?.checkOut) {
      const lastCheckOut = new Date(todayLog.checkOut);
      const diffMs = now.getTime() - lastCheckOut.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      if (diffMinutes < 2) {
        cooldownRemaining = Math.ceil((2 * 60 * 1000 - diffMs) / 1000);
      }
    }

    return { 
        status, 
        logs, 
        todayLog, 
        dailyStats: {
            workHours: dailyWorkHours.toFixed(2),
            breakHours: dailyBreakHours.toFixed(2),
            isOvertime: isDailyOvertime
        },
        cooldownRemaining,
    };
  }),

  checkIn: protectedProcedure
    .input(checkInInputSchema)
    .mutation(async ({ ctx, input }) => {
      const today = getTodayString();
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

        const lastCheckOut = new Date(existing.checkOut);
        const cooldownDiff = new Date().getTime() - lastCheckOut.getTime();
        const diffMinutes = cooldownDiff / (1000 * 60);
        if (diffMinutes < 2) {
           throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Please wait 2 minutes before clocking in again.",
          });
        }

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
          })
          .where(eq(attendance.id, existing.id));
        
        return;
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
    const today = getTodayString();
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

    const now = new Date();
    const checkInTime = new Date(log.checkIn);
    const durationMs = now.getTime() - checkInTime.getTime();
    const sessionWorkHours = Math.max(
      0,
      durationMs / (1000 * 60 * 60) - (Number(log.breakHours) || 0)
    );

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
    const isOvertime = totalDailyWork > 8;

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
    const today = getTodayString();
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
        lastBreak.end = now.toISOString();
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
      if (input.startDate > input.endDate) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Start date must be before or equal to end date" });
      }

      const diffDays = Math.round(
        Math.abs(new Date(input.endDate).getTime() - new Date(input.startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      const [balance, leaveType] = await Promise.all([
        ctx.db.query.leaveBalances.findFirst({
          where: and(
            eq(leaveBalances.userId, ctx.session.userId),
            eq(leaveBalances.orgId, ctx.session.orgId),
            eq(leaveBalances.leaveTypeId, input.typeId),
            eq(leaveBalances.year, new Date().getFullYear()),
          ),
        }),
        ctx.db.query.leaveTypes.findFirst({
          where: eq(leaveTypes.id, input.typeId),
          columns: { name: true },
        }),
      ]);

      const isUnpaid = leaveType?.name === LEAVE_POLICY.UNPAID.name;
      if (!isUnpaid && balance && Number(balance.balance) < diffDays) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Insufficient leave balance. Available: ${balance.balance}, Required: ${diffDays}`,
        });
      }

      const overlapping = await ctx.db.query.leaveRequests.findFirst({
        where: and(
          eq(leaveRequests.userId, ctx.session.userId),
          eq(leaveRequests.orgId, ctx.session.orgId),
          lte(leaveRequests.startDate, formatDateOnly(input.endDate)),
          gte(leaveRequests.startDate, formatDateOnly(input.startDate)),
        ),
      });

      if (overlapping && overlapping.status !== "REJECTED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You already have a leave request for overlapping dates",
        });
      }

      await ctx.db.insert(leaveRequests).values({
        orgId: ctx.session.orgId,
        userId: ctx.session.userId,
        leaveTypeId: input.typeId,
        startDate: formatDateOnly(input.startDate),
        endDate: formatDateOnly(input.endDate),
        reason: input.reason,
        status: "PENDING",
      });
    }),

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
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can generate payroll" });
      }
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
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can manage salary structures" });
      }
      const [structure] = await ctx.db.transaction(async (tx) => {
        await tx
          .update(salaryStructures)
          .set({ isActive: false })
          .where(
            and(
              eq(salaryStructures.userId, input.userId),
              eq(salaryStructures.orgId, ctx.session.orgId),
              eq(salaryStructures.isActive, true)
            )
          );

        return await tx
          .insert(salaryStructures)
          .values({
            orgId: ctx.session.orgId,
            userId: input.userId,
            basicSalary: input.basicSalary.toString(),
            hraPercentage: input.hraPercentage.toString(),
            allowances: input.allowances.toString(),
            deductions: input.deductions.toString(),
            effectiveFrom: formatDateOnly(input.effectiveFrom),
            effectiveTo: input.effectiveTo
              ? formatDateOnly(input.effectiveTo)
              : undefined,
            isActive: true,
          })
          .returning();
      });
      return structure;
    }),

  getExpenses: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        status: z.string().optional(),
        page: z.number().min(1).optional(),
        limit: z.number().min(1).max(100).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const page = input.page || DEFAULT_PAGE;
      const limit = input.limit || DEFAULT_LIMIT;
      const offset = getOffset(page, limit);

      const conditions = [eq(expenses.orgId, ctx.session.orgId)];
      if (input.userId) {
        conditions.push(eq(expenses.userId, input.userId));
      }
      if (input.status) {
        conditions.push(eq(expenses.status, input.status as "PENDING" | "APPROVED" | "REJECTED" | "PAID"));
      }
      if (input.startDate) {
        conditions.push(gte(expenses.expenseDate, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(expenses.expenseDate, input.endDate));
      }
      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(expenses)
        .where(and(...conditions));

      const total = Number(countResult?.count || 0);

      const data = await ctx.db.query.expenses.findMany({
        where: and(...conditions),
        orderBy: [desc(expenses.expenseDate)],
        limit,
        offset,
      });

      return createPaginatedResponse(data, total, page, limit);
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
          expenseDate: formatDateOnly(input.expenseDate),
          status: "PENDING",
        })
        .returning();
      return expense;
    }),

  updateExpenseStatus: protectedProcedure
    .input(updateExpenseStatusInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can update expense status" });
      }
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

  getEmployeeStats: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
        const rawBalances = await ctx.db
            .select({
                id: leaveTypes.id,
                name: leaveTypes.name,
                daysPerYear: leaveTypes.daysPerYear,
                balance: leaveBalances.balance,
            })
            .from(leaveTypes)
            .leftJoin(leaveBalances, and(
                eq(leaveBalances.leaveTypeId, leaveTypes.id),
                eq(leaveBalances.userId, input.userId),
                eq(leaveBalances.year, new Date().getFullYear())
            ))
            .where(eq(leaveTypes.orgId, ctx.session.orgId));

        const allowed = rawBalances.filter((b) => b.name && ALLOWED_LEAVE_TYPE_NAMES.has(b.name));
        const seen = new Set<string>();
        const balances = allowed.filter((b) => {
            if (!b.name || seen.has(b.name)) return false;
            seen.add(b.name);
            return true;
        });

        const targetMember = await ctx.db.query.organizationMembers.findFirst({
            where: and(
                eq(organizationMembers.userId, input.userId),
                eq(organizationMembers.orgId, ctx.session.orgId)
            ),
        });

        if (!targetMember) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Employee not found in your organization" });
        }

        const recentLeaves = await ctx.db.query.leaveRequests.findMany({
            where: and(
                eq(leaveRequests.userId, input.userId),
                eq(leaveRequests.orgId, ctx.session.orgId)
            ),
            limit: 5,
            orderBy: [desc(leaveRequests.createdAt)],
            with: {
                leaveType: true
            }
        });

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);

        const attendanceRecords = await ctx.db.query.attendance.findMany({
            where: and(
                eq(attendance.userId, input.userId),
                eq(attendance.orgId, ctx.session.orgId),
                gte(attendance.date, formatDateOnly(startOfMonth))
            )
        });

        const summary = {
            present: attendanceRecords.filter(a => a.status === 'PRESENT').length,
            absent: attendanceRecords.filter(a => a.status === 'ABSENT').length,
            late: attendanceRecords.filter(a => a.status === 'LATE').length, 
            totalDays: attendanceRecords.length
        };

        return {
            leaveBalances: balances.map(b => ({
                id: b.id,
                name: b.name,
                total: b.daysPerYear,
                remaining: b.balance ? Number(b.balance) : b.daysPerYear
            })),
            recentLeaves,
            attendance: summary
        };
    }),

  getMonthlyAttendance: protectedProcedure
    .input(z.object({
        userId: z.string(),
        year: z.number(),
        month: z.number()
    }))
    .query(async ({ ctx, input }) => {
        if (ctx.session.user.id !== input.userId && ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
            throw new TRPCError({ code: "FORBIDDEN" });
        }

        const startDate = new Date(input.year, input.month, 1);
        const endDate = new Date(input.year, input.month + 1, 0);

        return await ctx.db.query.attendance.findMany({
            where: and(
                eq(attendance.userId, input.userId),
                eq(attendance.orgId, ctx.session.orgId),
                gte(attendance.date, formatDateOnly(startDate)),
                lte(attendance.date, formatDateOnly(endDate))
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
            ? formatDateOnly(input.purchaseDate)
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
      const isAdmin = ctx.session.user.role === "OWNER" || ctx.session.user.role === "ADMIN";
      const targetUserId = (input.userId && isAdmin) ? input.userId : ctx.session.userId;

      const [document] = await ctx.db
        .insert(documents)
        .values({
          orgId: ctx.session.orgId,
          userId: targetUserId,
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
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can create performance reviews" });
      }
      const [review] = await ctx.db
        .insert(performanceReviews)
        .values({
          orgId: ctx.session.orgId,
          userId: input.userId,
          reviewerId: input.reviewerId || ctx.session.userId,
          periodStart: formatDateOnly(input.periodStart),
          periodEnd: formatDateOnly(input.periodEnd),
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
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can create goals" });
      }
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
          startDate: formatDateOnly(input.startDate),
          endDate: formatDateOnly(input.endDate),
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

  getWorkLogs: protectedProcedure
    .input(getWorkLogsInputSchema)
    .query(async ({ ctx, input }) => {
      const { year, quarter, userId } = input;
      const targetUserId = userId || ctx.session.userId;

      const startMonth = (quarter - 1) * 3;
      const startDate = new Date(year, startMonth, 1);
      const endDate = new Date(year, startMonth + 3, 0);

      const startStr = formatDateOnly(startDate);
      const endStr = formatDateOnly(endDate);
      
      const logs = await ctx.db.query.timesheets.findMany({
        where: and(
           eq(timesheets.orgId, ctx.session.orgId),
           eq(timesheets.userId, targetUserId),
        ),
      });
      return logs.filter(l => l.date >= startStr && l.date <= endStr);
    }),

  upsertWorkLog: protectedProcedure
    .input(upsertWorkLogInputSchema)
    .mutation(async ({ ctx, input }) => {
        const dateStr = formatDateOnly(input.date);
        
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

  getWfhRequests: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.wfhRequests.findMany({
      where: and(
        eq(wfhRequests.userId, ctx.session.userId),
        eq(wfhRequests.orgId, ctx.session.orgId)
      ),
      orderBy: [desc(wfhRequests.createdAt)],
    });
  }),

  getPendingWfhRequests: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
      return [];
    }
    return await ctx.db.query.wfhRequests.findMany({
      where: and(
        eq(wfhRequests.orgId, ctx.session.orgId),
        eq(wfhRequests.status, "PENDING")
      ),
      with: {
        user: true,
      },
      orderBy: [desc(wfhRequests.createdAt)],
    });
  }),

  getHolidaysForCalendar: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number() }))
    .query(async ({ ctx, input }) => {
      const start = new Date(input.year, input.month, 1);
      const end = new Date(input.year, input.month + 1, 0);
      const startStr = formatDateOnly(start);
      const endStr = formatDateOnly(end);
      return await ctx.db.query.holidays.findMany({
        where: and(
          eq(holidays.orgId, ctx.session.orgId),
          gte(holidays.date, startStr),
          lte(holidays.date, endStr)
        ),
        orderBy: [asc(holidays.date)],
      });
    }),

  getHolidaysForYear: protectedProcedure
    .input(z.object({ year: z.number() }))
    .query(async ({ ctx, input }) => {
      const startStr = `${input.year}-01-01`;
      const endStr = `${input.year}-12-31`;
      return await ctx.db.query.holidays.findMany({
        where: and(
          eq(holidays.orgId, ctx.session.orgId),
          gte(holidays.date, startStr),
          lte(holidays.date, endStr)
        ),
        orderBy: [asc(holidays.date)],
      });
    }),

  addHoliday: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "Name is required"),
      date: z.date(),
      message: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can add holidays" });
      }
      const dateStr = formatDateOnly(input.date);
      await ctx.db.insert(holidays).values({
        orgId: ctx.session.orgId,
        name: input.name,
        date: dateStr,
        message: input.message ?? null,
        notificationSent: false,
      });
      return { success: true };
    }),

  deleteHoliday: protectedProcedure
    .input(z.object({ holidayId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can delete holidays" });
      }
      await ctx.db
        .delete(holidays)
        .where(and(eq(holidays.id, input.holidayId), eq(holidays.orgId, ctx.session.orgId)));
      return { success: true };
    }),

  createWfhRequest: protectedProcedure
    .input(createWfhRequestInputSchema)
    .mutation(async ({ ctx, input }) => {
      const dateStr = formatDateOnly(input.date);

      const existing = await ctx.db.query.wfhRequests.findFirst({
        where: and(
          eq(wfhRequests.userId, ctx.session.userId),
          eq(wfhRequests.orgId, ctx.session.orgId),
          eq(wfhRequests.date, dateStr),
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already have a WFH request for this date",
        });
      }

      const [request] = await ctx.db.insert(wfhRequests).values({
        orgId: ctx.session.orgId,
        userId: ctx.session.userId,
        date: dateStr,
        reason: input.reason,
        approverId: input.approverId,
        status: "PENDING",
      }).returning();
      return request;
    }),

  processWfhRequest: protectedProcedure
    .input(processWfhRequestInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      await ctx.db.update(wfhRequests)
        .set({
          status: input.status,
          rejectionReason: input.rejectionReason,
          updatedAt: new Date(),
        })
        .where(and(
          eq(wfhRequests.id, input.requestId),
          eq(wfhRequests.orgId, ctx.session.orgId)
        ));

      return { success: true };
    }),

  getDevices: protectedProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const conditions = [eq(employeeDevices.orgId, ctx.session.orgId)];
      if (input.userId) {
        conditions.push(eq(employeeDevices.userId, input.userId));
      }

      return await ctx.db.query.employeeDevices.findMany({
        where: and(...conditions),
        with: {
          user: true,
        },
        orderBy: [desc(employeeDevices.createdAt)],
      });
    }),

  createDevice: protectedProcedure
    .input(createDeviceInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const [device] = await ctx.db.insert(employeeDevices).values({
        orgId: ctx.session.orgId,
        userId: input.userId,
        deviceType: input.deviceType,
        deviceName: input.deviceName,
        serialNumber: input.serialNumber,
        brand: input.brand,
        model: input.model,
        assignedDate: input.assignedDate ? formatDateOnly(input.assignedDate) : undefined,
        notes: input.notes,
        status: "ACTIVE",
      }).returning();

      return device;
    }),

  updateDevice: protectedProcedure
    .input(updateDeviceInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const { deviceId, ...updateData } = input;
      await ctx.db.update(employeeDevices)
        .set({
          ...(updateData.deviceType && { deviceType: updateData.deviceType }),
          ...(updateData.deviceName && { deviceName: updateData.deviceName }),
          ...(updateData.serialNumber !== undefined && { serialNumber: updateData.serialNumber }),
          ...(updateData.brand !== undefined && { brand: updateData.brand }),
          ...(updateData.model !== undefined && { model: updateData.model }),
          ...(updateData.status && { status: updateData.status }),
          ...(updateData.returnDate && { returnDate: formatDateOnly(updateData.returnDate) }),
          ...(updateData.notes !== undefined && { notes: updateData.notes }),
          updatedAt: new Date(),
        })
        .where(and(
          eq(employeeDevices.id, deviceId),
          eq(employeeDevices.orgId, ctx.session.orgId)
        ));

      return { success: true };
    }),

  deleteDevice: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      await ctx.db.delete(employeeDevices)
        .where(and(
          eq(employeeDevices.id, input.deviceId),
          eq(employeeDevices.orgId, ctx.session.orgId)
        ));

      return { success: true };
    }),

  generateEmployeePayslip: protectedProcedure
    .input(generateEmployeePayslipInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const salaryStructure = await ctx.db.query.salaryStructures.findFirst({
        where: and(
          eq(salaryStructures.userId, input.userId),
          eq(salaryStructures.orgId, ctx.session.orgId),
          eq(salaryStructures.isActive, true)
        ),
      });

      const monthlySalary = user.monthlySalary ? parseFloat(user.monthlySalary) : 0;
      const workingDays = 30;
      const perDaySalary = monthlySalary / workingDays;
      const lopDeduction = (input.lopDays || 0) * perDaySalary;
      const halfDayDeduction = ((input.halfDays || 0) * perDaySalary) / 2;
      const basicSalary = salaryStructure ? parseFloat(salaryStructure.basicSalary) : monthlySalary * 0.5;
      const hra = salaryStructure ? (parseFloat(salaryStructure.basicSalary) * parseFloat(salaryStructure.hraPercentage || "40") / 100) : monthlySalary * 0.5;
      const bonus = input.bonus || 0;
      const overtimeAmount = input.overtimeAmount || 0;
      const professionalTax = 200;
      const otherDeductions = input.otherDeductions || 0;
      const totalDeductions = professionalTax + lopDeduction + halfDayDeduction + otherDeductions;

      const grossSalary = monthlySalary + bonus + overtimeAmount;
      const netSalary = grossSalary - totalDeductions;

      const existing = await ctx.db.query.payrolls.findFirst({
        where: and(
          eq(payrolls.userId, input.userId),
          eq(payrolls.month, input.month),
          eq(payrolls.orgId, ctx.session.orgId)
        ),
      });

      const payrollData = {
        basicSalary: basicSalary.toString(),
        hra: hra.toString(),
        allowances: bonus.toString(),
        deductions: totalDeductions.toString(),
        grossSalary: grossSalary.toString(),
        netSalary: netSalary.toString(),
        overtimeType: input.overtimeType || null,
        overtimeDays: (input.overtimeDays || 0).toString(),
        overtimeHours: (input.overtimeHours || 0).toString(),
        overtimeAmount: overtimeAmount.toString(),
        status: "DRAFT" as const,
        generatedBy: ctx.session.userId,
      };

      if (existing) {
        await ctx.db.update(payrolls)
          .set(payrollData)
          .where(eq(payrolls.id, existing.id));
        if (user.email) {
          const monthDate = new Date(input.month + "-01");
          const monthName = monthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
          const employeeName = user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user.name || "Employee";
          
          sendPayslipGeneratedEmail(
            user.email,
            employeeName,
            monthName,
            netSalary.toLocaleString()
          ).catch(() => {});
        }
        
        return existing;
      }

      const [payroll] = await ctx.db.insert(payrolls).values({
        orgId: ctx.session.orgId,
        userId: input.userId,
        month: input.month,
        ...payrollData,
      }).returning();
      if (user.email) {
        const monthDate = new Date(input.month + "-01");
        const monthName = monthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
        const employeeName = user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user.name || "Employee";
        
        sendPayslipGeneratedEmail(
          user.email,
          employeeName,
          monthName,
          netSalary.toLocaleString()
        ).catch(() => {});
      }

      return payroll;
    }),

  getEmployeePayslips: protectedProcedure
    .input(z.object({ userId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const targetUserId = input.userId || ctx.session.userId;
      
      if (targetUserId !== ctx.session.userId && 
          ctx.session.user.role !== "OWNER" && 
          ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      return await ctx.db.query.payrolls.findMany({
        where: and(
          eq(payrolls.userId, targetUserId),
          eq(payrolls.orgId, ctx.session.orgId)
        ),
        orderBy: [desc(payrolls.month)],
        with: {
          user: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              name: true,
              designation: true,
              email: true,
              joiningDate: true,
              taxId: true,
              bankDetails: true,
              employeeId: true,
            },
          },
        },
      });
    }),

  approvePayroll: protectedProcedure
    .input(z.object({ payrollId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      await ctx.db.update(payrolls)
        .set({
          status: "APPROVED",
          approvedBy: ctx.session.userId,
        })
        .where(and(
          eq(payrolls.id, input.payrollId),
          eq(payrolls.orgId, ctx.session.orgId)
        ));

      return { success: true };
    }),

  markPayrollPaid: protectedProcedure
    .input(z.object({ payrollId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      await ctx.db.update(payrolls)
        .set({ status: "PAID" })
        .where(and(
          eq(payrolls.id, input.payrollId),
          eq(payrolls.orgId, ctx.session.orgId)
        ));

      return { success: true };
    }),

  getAllPayrolls: protectedProcedure
    .input(z.object({ month: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.role !== "OWNER" && ctx.session.user.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const conditions = [eq(payrolls.orgId, ctx.session.orgId)];
      if (input.month) {
        conditions.push(eq(payrolls.month, input.month));
      }

      const results = await ctx.db.select({
        payroll: payrolls,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          designation: users.designation,
          employeeId: users.employeeId,
          bankDetails: users.bankDetails,
          joiningDate: users.joiningDate,
          taxId: users.taxId,
        },
      })
      .from(payrolls)
      .leftJoin(users, eq(payrolls.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(payrolls.month));

      return results.map(r => ({
        ...r.payroll,
        user: r.user,
      }));
    }),
});
