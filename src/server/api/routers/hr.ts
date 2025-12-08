import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { departments, users, attendance, leaveRequests, leaveBalances, leaveTypes, payrolls } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { format } from "date-fns";
import { TRPCError } from "@trpc/server";
import { checkInInputSchema } from "@/lib/validations/attendance";
import { requestLeaveInputSchema } from "@/lib/validations/leave";
import { createDepartmentInputSchema, updateProfileInputSchema, generatePayrollInputSchema } from "@/lib/validations/hr";

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
            startDate: input.startDate,
            endDate: input.endDate,
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
        organizationId: ctx.session.orgId 
      });
      
      for (const mem of memberships.data) {
        const uId = mem.publicUserData?.userId;
        if (!uId) continue;

        // TODO: Fetch from salaryStructures table
        // Create salaryStructures table with fields: userId, orgId, basicSalary, hraPercentage, allowances, deductions
        // For now, using placeholder values - this should be replaced with actual salary structure lookup
        const basic = 50000;
        const hra = basic * 0.4;
        const allowances = 5000;
        const deductions = 2000;
        const gross = basic + hra + allowances;
        const net = gross - deductions;

        const existing = await ctx.db.query.payrolls.findFirst({
          where: and(
            eq(payrolls.userId, uId), 
            eq(payrolls.month, input.month), 
            eq(payrolls.orgId, ctx.session.orgId)
          )
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
});
