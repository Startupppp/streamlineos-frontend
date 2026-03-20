import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { tickets, cycles, timesheets } from "../../../../lib/db/schema";
import { eq, and, count, sql, gte } from "drizzle-orm";

export const projectAnalyticsRouter = createTRPCRouter({
  analyticsGetProjectAnalytics: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const orgFilter = and(eq(tickets.projectId, input.projectId), eq(tickets.orgId, ctx.session.orgId));

      const stateDistribution = await ctx.db
        .select({
          status: tickets.status,
          count: count(),
        })
        .from(tickets)
        .where(orgFilter)
        .groupBy(tickets.status);

      const priorityBreakdown = await ctx.db
        .select({
          priority: tickets.priority,
          count: count(),
        })
        .from(tickets)
        .where(orgFilter)
        .groupBy(tickets.priority);

      const assigneeCompletion = await ctx.db
        .select({
          assigneeId: tickets.assigneeId,
          total: count(),
          completed: count(sql`CASE WHEN ${tickets.status} = 'DONE' THEN 1 END`),
        })
        .from(tickets)
        .where(
          and(
            orgFilter,
            sql`${tickets.assigneeId} IS NOT NULL`
          )
        )
        .groupBy(tickets.assigneeId);

      const twelveWeeksAgo = new Date();
      twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

      const volumeOverTime = await ctx.db
        .select({
          week: sql<string>`TO_CHAR(DATE_TRUNC('week', ${tickets.createdAt}), 'YYYY-MM-DD')`,
          count: count(),
        })
        .from(tickets)
        .where(
          and(
            orgFilter,
            gte(tickets.createdAt, twelveWeeksAgo)
          )
        )
        .groupBy(sql`DATE_TRUNC('week', ${tickets.createdAt})`)
        .orderBy(sql`DATE_TRUNC('week', ${tickets.createdAt})`);

      const cycleVelocity = await ctx.db
        .select({
          cycleId: cycles.id,
          cycleName: cycles.name,
          completedPoints: sql<number>`COALESCE(SUM(CASE WHEN ${tickets.status} = 'DONE' THEN COALESCE(${tickets.storyPoints}, ${tickets.estimate}, 0) ELSE 0 END), 0)`,
        })
        .from(cycles)
        .leftJoin(tickets, eq(tickets.cycleId, cycles.id))
        .where(
          and(
            eq(cycles.projectId, input.projectId),
            eq(cycles.orgId, ctx.session.orgId)
          )
        )
        .groupBy(cycles.id, cycles.name)
        .orderBy(cycles.startDate);

      const estimateVsActual = await ctx.db
        .select({
          ticketId: tickets.id,
          title: tickets.title,
          estimated: tickets.originalEstimate,
          actual: sql<number>`COALESCE(SUM(${timesheets.hours}), 0)`,
        })
        .from(tickets)
        .leftJoin(timesheets, eq(timesheets.ticketId, tickets.id))
        .where(
          and(
            orgFilter,
            sql`${tickets.originalEstimate} IS NOT NULL`
          )
        )
        .groupBy(tickets.id, tickets.title, tickets.originalEstimate)
        .limit(50);

      return {
        stateDistribution,
        priorityBreakdown,
        assigneeCompletion,
        volumeOverTime,
        cycleVelocity,
        estimateVsActual,
      };
    }),

  analyticsGetWorkspaceAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const projectSummary = await ctx.db
      .select({
        projectId: tickets.projectId,
        total: count(),
        completed: count(sql`CASE WHEN ${tickets.status} = 'DONE' THEN 1 END`),
        inProgress: count(sql`CASE WHEN ${tickets.status} = 'IN_PROGRESS' THEN 1 END`),
      })
      .from(tickets)
      .where(eq(tickets.orgId, ctx.session.orgId))
      .groupBy(tickets.projectId);

    const activeCycles = await ctx.db
      .select({
        id: cycles.id,
        name: cycles.name,
        projectId: cycles.projectId,
        startDate: cycles.startDate,
        endDate: cycles.endDate,
      })
      .from(cycles)
      .where(and(eq(cycles.orgId, ctx.session.orgId), eq(cycles.status, "active")));

    return { projectSummary, activeCycles };
  }),
});
