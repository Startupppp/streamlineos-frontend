import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { isAdminOrOwner } from "../../../../lib/auth-helpers";
import {
  leaveRequests,
  leaveBalances,
  leaveTypes,
  organizationMembers,
  attendance,
  wfhRequests,
  holidays,
} from "../../../../lib/db/schema";
import { eq, and, desc, gte, lte, asc } from "drizzle-orm";
import { formatDateOnly } from "../../../../lib/date-utils";
import { ALLOWED_LEAVE_TYPE_NAMES, LEAVE_POLICY } from "../../../../lib/leave-policy";
import { TRPCError } from "@trpc/server";
import { requestLeaveInputSchema } from "../../../../lib/validations/leave";
import {
  createWfhRequestInputSchema,
  processWfhRequestInputSchema,
} from "../../../../lib/validations/hr";

export const leaveRouter = createTRPCRouter({
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

  getEmployeeStats: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
        const isAdmin = isAdminOrOwner(ctx.session.user.role);
        if (input.userId !== ctx.session.userId && !isAdmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to view other employees' stats" });
        }

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

      const result = await ctx.db.update(wfhRequests)
        .set({
          status: input.status,
          rejectionReason: input.rejectionReason,
          updatedAt: new Date(),
        })
        .where(and(
          eq(wfhRequests.id, input.requestId),
          eq(wfhRequests.orgId, ctx.session.orgId),
          eq(wfhRequests.status, "PENDING")
        ))
        .returning({ id: wfhRequests.id });
      if (result.length === 0) {
        throw new TRPCError({ code: "CONFLICT", message: "WFH request has already been processed" });
      }

      return { success: true };
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
});
