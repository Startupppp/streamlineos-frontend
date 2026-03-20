import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { cycles, tickets } from "../../../../lib/db/schema";
import { eq, and, or, count, sql, lte, gte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const cyclesRouter = createTRPCRouter({
  cyclesGetByProject: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        status: z.enum(["draft", "active", "completed"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(cycles.projectId, input.projectId),
        eq(cycles.orgId, ctx.session.orgId),
      ];
      if (input.status) conditions.push(eq(cycles.status, input.status));

      const cycleList = await ctx.db
        .select()
        .from(cycles)
        .where(and(...conditions))
        .orderBy(cycles.startDate);

      if (cycleList.length === 0) return [];

      const cycleIds = cycleList.map((c) => c.id);
      const statsRows = await ctx.db
        .select({
          cycleId: tickets.cycleId,
          total: count(),
          completed: count(sql`CASE WHEN ${tickets.status} = 'DONE' THEN 1 END`),
        })
        .from(tickets)
        .where(sql`${tickets.cycleId} IN (${sql.join(cycleIds.map((id) => sql`${id}`), sql`, `)})`)
        .groupBy(tickets.cycleId);

      const statsMap = new Map(statsRows.map((s) => [s.cycleId, s]));

      return cycleList.map((cycle) => {
        const stats = statsMap.get(cycle.id);
        const total = stats?.total ?? 0;
        const completed = stats?.completed ?? 0;
        return {
          ...cycle,
          totalItems: total,
          completedItems: completed,
          progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      });
    }),

  cyclesGetById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [cycle] = await ctx.db
        .select()
        .from(cycles)
        .where(and(eq(cycles.id, input.id), eq(cycles.orgId, ctx.session.orgId)));

      if (!cycle) throw new TRPCError({ code: "NOT_FOUND" });

      const workItems = await ctx.db.query.tickets.findMany({
        where: eq(tickets.cycleId, cycle.id),
        with: { assignee: true, state: true },
        orderBy: tickets.order,
      });

      const [stats] = await ctx.db
        .select({
          total: count(),
          completed: count(sql`CASE WHEN ${tickets.status} = 'DONE' THEN 1 END`),
          inProgress: count(sql`CASE WHEN ${tickets.status} = 'IN_PROGRESS' THEN 1 END`),
        })
        .from(tickets)
        .where(eq(tickets.cycleId, cycle.id));

      return {
        ...cycle,
        workItems,
        stats: {
          total: stats?.total ?? 0,
          completed: stats?.completed ?? 0,
          inProgress: stats?.inProgress ?? 0,
          pending: (stats?.total ?? 0) - (stats?.completed ?? 0) - (stats?.inProgress ?? 0),
          progress:
            stats && stats.total > 0
              ? Math.round(((stats.completed ?? 0) / stats.total) * 100)
              : 0,
        },
      };
    }),

  cyclesCreate: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const overlapping = await ctx.db
        .select({ id: cycles.id })
        .from(cycles)
        .where(
          and(
            eq(cycles.projectId, input.projectId),
            eq(cycles.orgId, ctx.session.orgId),
            or(
              and(lte(cycles.startDate, input.startDate), gte(cycles.endDate, input.startDate)),
              and(lte(cycles.startDate, input.endDate), gte(cycles.endDate, input.endDate)),
              and(gte(cycles.startDate, input.startDate), lte(cycles.endDate, input.endDate))
            )
          )
        )
        .limit(1);

      if (overlapping.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Cycle dates overlap with an existing cycle.",
        });
      }

      const [cycle] = await ctx.db
        .insert(cycles)
        .values({
          projectId: input.projectId,
          orgId: ctx.session.orgId,
          name: input.name,
          description: input.description,
          startDate: input.startDate,
          endDate: input.endDate,
          createdBy: ctx.session.userId,
        })
        .returning();

      return cycle;
    }),

  cyclesUpdate: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        status: z.enum(["draft", "active", "completed"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      if (data.status === "active") {
        const [existing] = await ctx.db
          .select({ id: cycles.id })
          .from(cycles)
          .where(
            and(
              eq(cycles.status, "active"),
              eq(cycles.orgId, ctx.session.orgId)
            )
          )
          .limit(1);

        const currentCycle = await ctx.db
          .select({ projectId: cycles.projectId })
          .from(cycles)
          .where(eq(cycles.id, id));

        if (
          existing &&
          existing.id !== id &&
          currentCycle[0]
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Only one active cycle is allowed at a time per project.",
          });
        }
      }

      const [updated] = await ctx.db
        .update(cycles)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(cycles.id, id), eq(cycles.orgId, ctx.session.orgId)))
        .returning();

      return updated;
    }),

  cyclesComplete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        transferToCycleId: z.number().optional(),
        moveToBacklog: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const [cycle] = await tx
          .update(cycles)
          .set({ status: "completed", updatedAt: new Date() })
          .where(and(eq(cycles.id, input.id), eq(cycles.orgId, ctx.session.orgId)))
          .returning();

        if (!cycle) throw new TRPCError({ code: "NOT_FOUND" });

        const incompleteItems = await tx
          .select({ id: tickets.id })
          .from(tickets)
          .where(
            and(
              eq(tickets.cycleId, input.id),
              sql`${tickets.status} != 'DONE'`
            )
          );

        if (incompleteItems.length > 0) {
          const itemIds = incompleteItems.map((t) => t.id);

          if (input.transferToCycleId) {
            await tx
              .update(tickets)
              .set({ cycleId: input.transferToCycleId, updatedAt: new Date() })
              .where(sql`${tickets.id} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`);
          } else if (input.moveToBacklog) {
            await tx
              .update(tickets)
              .set({ cycleId: null, updatedAt: new Date() })
              .where(sql`${tickets.id} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`);
          }
        }

        return {
          cycle,
          incompleteCount: incompleteItems.length,
        };
      });
    }),

  cyclesGetBurndown: protectedProcedure
    .input(z.object({ cycleId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [cycle] = await ctx.db
        .select()
        .from(cycles)
        .where(and(eq(cycles.id, input.cycleId), eq(cycles.orgId, ctx.session.orgId)));

      if (!cycle) throw new TRPCError({ code: "NOT_FOUND" });

      const allTickets = await ctx.db
        .select({
          id: tickets.id,
          status: tickets.status,
          updatedAt: tickets.updatedAt,
          createdAt: tickets.createdAt,
        })
        .from(tickets)
        .where(eq(tickets.cycleId, input.cycleId));

      const start = new Date(cycle.startDate);
      const end = new Date(cycle.endDate);
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const totalItems = allTickets.length;

      const burndownData = [];
      for (let i = 0; i <= totalDays; i++) {
        const day = new Date(start);
        day.setDate(day.getDate() + i);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        const completedByDay = allTickets.filter(
          (t) =>
            t.status === "DONE" &&
            t.updatedAt &&
            new Date(t.updatedAt) <= dayEnd
        ).length;

        const ideal = totalItems - (totalItems / totalDays) * i;

        burndownData.push({
          date: day.toISOString().split("T")[0],
          remaining: totalItems - completedByDay,
          ideal: Math.max(0, Math.round(ideal * 10) / 10),
        });
      }

      return burndownData;
    }),

  cyclesDelete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(tickets)
        .set({ cycleId: null })
        .where(eq(tickets.cycleId, input.id));

      await ctx.db
        .delete(cycles)
        .where(and(eq(cycles.id, input.id), eq(cycles.orgId, ctx.session.orgId)));
    }),
});
