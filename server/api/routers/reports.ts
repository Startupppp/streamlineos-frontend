import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { db } from "../../../lib/db";
import {
  attendance,
  payrolls,
  projects,
  tickets,
  timesheets,
  leaveRequests,
} from "../../../lib/db/schema";
import { eq, and, sql, gte, lte, desc } from "drizzle-orm";
import { format } from "date-fns";
import { formatDateOnly, getTodayString } from "../../../lib/date-utils";

export const reportsRouter = createTRPCRouter({
  getAttendanceReport: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const records = await ctx.db.query.attendance.findMany({
        where: and(
          eq(attendance.orgId, ctx.session.orgId),
          ...(input.userId ? [eq(attendance.userId, input.userId)] : []),
          gte(attendance.date, formatDateOnly(input.startDate)),
          lte(attendance.date, formatDateOnly(input.endDate))
        ),
        orderBy: [desc(attendance.date)],
      });

      const totalDays = records.length;
      const totalHours = records.reduce(
        (sum, r) => sum + parseFloat(r.workHours || "0"),
        0
      );
      const averageHours = totalDays > 0 ? totalHours / totalDays : 0;
      const overtimeDays = records.filter((r) => r.isOvertime).length;

      return {
        records,
        summary: {
          totalDays,
          totalHours: Math.round(totalHours * 10) / 10,
          averageHours: Math.round(averageHours * 10) / 10,
          overtimeDays,
        },
      };
    }),

  getPayrollReport: protectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        startMonth: z.string(),
        endMonth: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const payrollsList = await ctx.db.query.payrolls.findMany({
        where: and(
          eq(payrolls.orgId, ctx.session.orgId),
          ...(input.userId ? [eq(payrolls.userId, input.userId)] : []),
          sql`${payrolls.month} >= ${input.startMonth}`,
          sql`${payrolls.month} <= ${input.endMonth}`
        ),
        orderBy: [desc(payrolls.month)],
      });

      const totalGross = payrollsList.reduce(
        (sum, p) => sum + parseFloat(p.grossSalary || "0"),
        0
      );
      const totalNet = payrollsList.reduce(
        (sum, p) => sum + parseFloat(p.netSalary || "0"),
        0
      );
      const totalDeductions = payrollsList.reduce(
        (sum, p) => sum + parseFloat(p.deductions || "0"),
        0
      );

      return {
        payrolls: payrollsList,
        summary: {
          count: payrollsList.length,
          totalGross: Math.round(totalGross * 10) / 10,
          totalNet: Math.round(totalNet * 10) / 10,
          totalDeductions: Math.round(totalDeductions * 10) / 10,
        },
      };
    }),

  getProjectReport: protectedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(projects.orgId, ctx.session.orgId)];
      if (input.projectId) {
        conditions.push(eq(projects.id, input.projectId));
      }

      const projectsList = await ctx.db.query.projects.findMany({
        where: and(...conditions),
        with: {
          tickets: {
            with: {
              assignee: true,
            },
          },
        },
      });

      const projectStats = projectsList.map((project) => {
        const tickets = project.tickets || [];
        const totalTickets = tickets.length;
        const completedTickets = tickets.filter(
          (t) => t.status === "DONE"
        ).length;
        const inProgressTickets = tickets.filter(
          (t) => t.status === "IN_PROGRESS"
        ).length;
        const totalPoints = tickets.reduce(
          (sum, t) => sum + (t.points || 0),
          0
        );
        const completedPoints = tickets
          .filter((t) => t.status === "DONE")
          .reduce((sum, t) => sum + (t.points || 0), 0);

        return {
          projectId: project.id,
          projectName: project.name,
          totalTickets,
          completedTickets,
          inProgressTickets,
          totalPoints,
          completedPoints,
          completionRate:
            totalTickets > 0 ? (completedTickets / totalTickets) * 100 : 0,
          pointsCompletionRate:
            totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0,
        };
      });

      return {
        projects: projectStats,
        summary: {
          totalProjects: projectsList.length,
          activeProjects: projectsList.filter((p) => p.status === "ACTIVE")
            .length,
          totalTickets: projectStats.reduce(
            (sum, p) => sum + p.totalTickets,
            0
          ),
          completedTickets: projectStats.reduce(
            (sum, p) => sum + p.completedTickets,
            0
          ),
        },
      };
    }),

  getTeamPerformanceReport: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const timeEntries = await ctx.db.query.timesheets.findMany({
        where: and(
          eq(timesheets.orgId, ctx.session.orgId),
          gte(timesheets.date, formatDateOnly(input.startDate)),
          lte(timesheets.date, formatDateOnly(input.endDate))
        ),
        with: {
          ticket: {
            with: {
              assignee: true,
            },
          },
        },
      });

      const userStats = new Map<
        string,
        {
          userId: string;
          userName: string;
          totalHours: number;
          ticketsWorked: Set<number>;
          ticketsCompleted: number;
        }
      >();

      timeEntries.forEach((entry) => {
        if (!entry.userId || !entry.ticket || !entry.ticketId) return;

        const existing = userStats.get(entry.userId);
        const hours = parseFloat(entry.hours || "0");

        if (existing) {
          existing.totalHours += hours;
          if (!existing.ticketsWorked) {
            existing.ticketsWorked = new Set<number>();
          }
          existing.ticketsWorked.add(entry.ticketId);
        } else {
          userStats.set(entry.userId, {
            userId: entry.userId,
            userName: entry.ticket?.assignee?.firstName || "Unknown",
            totalHours: hours,
            ticketsWorked: new Set([entry.ticketId]),
            ticketsCompleted: 0,
          });
        }
      });

      const completedTickets = await ctx.db.query.tickets.findMany({
        where: and(
          eq(tickets.orgId, ctx.session.orgId),
          eq(tickets.status, "DONE"),
          gte(tickets.updatedAt, input.startDate),
          lte(tickets.updatedAt, input.endDate)
        ),
      });

      completedTickets.forEach((ticket) => {
        if (ticket.assigneeId) {
          const stats = userStats.get(ticket.assigneeId);
          if (stats) {
            stats.ticketsCompleted += 1;
          }
        }
      });

      return Array.from(userStats.values()).map((stats) => ({
        ...stats,
        ticketsWorked: stats.ticketsWorked.size || 0,
      }));
    }),

  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    const today = getTodayString();
    const thisMonth = format(new Date(), "yyyy-MM");


    const [
      activeProjects,
      activeTickets,
      todayAttendance,
      thisMonthPayrolls,
      pendingLeaves,
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(projects)
        .where(
          and(
            eq(projects.orgId, ctx.session.orgId),
            eq(projects.status, "ACTIVE")
          )
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(tickets)
        .where(
          and(
            eq(tickets.orgId, ctx.session.orgId),
            sql`${tickets.status} IN ('TODO', 'IN_PROGRESS', 'IN_REVIEW')`
          )
        ),
      db.query.attendance.findFirst({
        where: and(
          eq(attendance.userId, ctx.session.userId),
          eq(attendance.date, today),
          eq(attendance.orgId, ctx.session.orgId)
        ),
      }),
      db.query.payrolls.findMany({
        where: and(
          eq(payrolls.orgId, ctx.session.orgId),
          sql`${payrolls.month} = ${thisMonth}`
        ),
      }),
      db.query.leaveRequests.findMany({
        where: and(
          eq(leaveRequests.orgId, ctx.session.orgId),
          eq(leaveRequests.status, "PENDING")
        ),
        limit: 10,
      }),
    ]);

    return {
      activeProjects: activeProjects[0]?.count || 0,
      activeTickets: activeTickets[0]?.count || 0,
      todayAttendance: todayAttendance
        ? {
            checkedIn: !!todayAttendance.checkIn,
            checkedOut: !!todayAttendance.checkOut,
            workHours: todayAttendance.workHours,
          }
        : null,
      thisMonthPayrolls: thisMonthPayrolls.length,
      pendingLeaves: pendingLeaves.length,
    };
  }),
});
