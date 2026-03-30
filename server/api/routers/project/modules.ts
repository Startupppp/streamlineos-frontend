import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { modules, moduleLinks, tickets } from "@/lib/db/schema";
import { eq, and, count, sql, or } from "drizzle-orm";
import { safeIlike } from "@/lib/db/search-utils";
import {
  createPaginatedResponse,
  getOffset,
} from "@/lib/pagination";
import { TRPCError } from "@trpc/server";

export const modulesRouter = createTRPCRouter({
  modulesGetByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const moduleList = await ctx.db
        .select()
        .from(modules)
        .where(
          and(
            eq(modules.projectId, input.projectId),
            eq(modules.orgId, ctx.session.orgId)
          )
        )
        .orderBy(modules.name);

      if (moduleList.length === 0) return [];

      const moduleIds = moduleList.map((m) => m.id);
      const statsRows = await ctx.db
        .select({
          moduleId: tickets.moduleId,
          total: count(),
          completed: count(sql`CASE WHEN ${tickets.status} = 'DONE' THEN 1 END`),
        })
        .from(tickets)
        .where(sql`${tickets.moduleId} IN (${sql.join(moduleIds.map((id) => sql`${id}`), sql`, `)})`)
        .groupBy(tickets.moduleId);

      const statsMap = new Map(statsRows.map((s) => [s.moduleId, s]));

      return moduleList.map((mod) => {
        const stats = statsMap.get(mod.id);
        const total = stats?.total ?? 0;
        const completed = stats?.completed ?? 0;
        return {
          ...mod,
          totalItems: total,
          completedItems: completed,
          progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      });
    }),

  modulesGetByProjectPaginated: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, limit, search, projectId } = input;
      const offset = getOffset(page, limit);

      const baseConditions = [
        eq(modules.projectId, projectId),
        eq(modules.orgId, ctx.session.orgId),
      ];

      const searchConditions = search
        ? [
            ...baseConditions,
            or(
              safeIlike(modules.name, search),
              safeIlike(modules.description, search)
            ),
          ]
        : baseConditions;

      const [dataResult, countResult] = await Promise.all([
        ctx.db
          .select()
          .from(modules)
          .where(and(...searchConditions))
          .orderBy(modules.name)
          .limit(limit)
          .offset(offset),
        ctx.db
          .select({ total: count() })
          .from(modules)
          .where(and(...searchConditions)),
      ]);

      const total = countResult[0]?.total ?? 0;

      // Enrich with ticket stats (same as non-paginated version)
      if (dataResult.length > 0) {
        const moduleIds = dataResult.map((m) => m.id);
        const statsRows = await ctx.db
          .select({
            moduleId: tickets.moduleId,
            total: count(),
            completed: count(sql`CASE WHEN ${tickets.status} = 'DONE' THEN 1 END`),
          })
          .from(tickets)
          .where(sql`${tickets.moduleId} IN (${sql.join(moduleIds.map((id) => sql`${id}`), sql`, `)})`)
          .groupBy(tickets.moduleId);

        const statsMap = new Map(statsRows.map((s) => [s.moduleId, s]));

        const enriched = dataResult.map((mod) => {
          const stats = statsMap.get(mod.id);
          const totalItems = stats?.total ?? 0;
          const completed = stats?.completed ?? 0;
          return {
            ...mod,
            totalItems,
            completedItems: completed,
            progress: totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0,
          };
        });

        return createPaginatedResponse(enriched, total, page, limit);
      }

      return createPaginatedResponse([], total, page, limit);
    }),

  modulesGetById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [mod] = await ctx.db
        .select()
        .from(modules)
        .where(and(eq(modules.id, input.id), eq(modules.orgId, ctx.session.orgId)));

      if (!mod) throw new TRPCError({ code: "NOT_FOUND" });

      const workItems = await ctx.db.query.tickets.findMany({
        where: eq(tickets.moduleId, mod.id),
        with: { assignee: true, state: true },
        orderBy: tickets.order,
      });

      const links = await ctx.db
        .select()
        .from(moduleLinks)
        .where(eq(moduleLinks.moduleId, mod.id));

      const linkedModules = links.length > 0
        ? await ctx.db
            .select()
            .from(modules)
            .where(and(
              sql`${modules.id} IN (${sql.join(links.map(l => sql`${l.linkedModuleId}`), sql`, `)})`,
              eq(modules.orgId, ctx.session.orgId)
            ))
        : [];

      const [stats] = await ctx.db
        .select({
          total: count(),
          completed: count(sql`CASE WHEN ${tickets.status} = 'DONE' THEN 1 END`),
        })
        .from(tickets)
        .where(eq(tickets.moduleId, mod.id));

      return {
        ...mod,
        workItems,
        linkedModules,
        stats: {
          total: stats?.total ?? 0,
          completed: stats?.completed ?? 0,
          progress:
            stats && stats.total > 0
              ? Math.round(((stats.completed ?? 0) / stats.total) * 100)
              : 0,
        },
      };
    }),

  modulesCreate: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        status: z.enum(["backlog", "planned", "in-progress", "completed", "paused", "cancelled"]).default("backlog"),
        leadId: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [mod] = await ctx.db
        .insert(modules)
        .values({
          projectId: input.projectId,
          orgId: ctx.session.orgId,
          name: input.name,
          description: input.description,
          status: input.status,
          leadId: input.leadId,
          startDate: input.startDate,
          endDate: input.endDate,
          createdBy: ctx.session.userId,
        })
        .returning();
      return mod;
    }),

  modulesUpdate: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        status: z.enum(["backlog", "planned", "in-progress", "completed", "paused", "cancelled"]).optional(),
        leadId: z.string().nullable().optional(),
        startDate: z.string().nullable().optional(),
        endDate: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(modules)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(modules.id, id), eq(modules.orgId, ctx.session.orgId)))
        .returning();
      return updated;
    }),

  modulesLinkModule: protectedProcedure
    .input(z.object({ moduleId: z.number(), linkedModuleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(moduleLinks).values({
        moduleId: input.moduleId,
        linkedModuleId: input.linkedModuleId,
      });
    }),

  modulesUnlinkModule: protectedProcedure
    .input(z.object({ moduleId: z.number(), linkedModuleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(moduleLinks)
        .where(
          and(
            eq(moduleLinks.moduleId, input.moduleId),
            eq(moduleLinks.linkedModuleId, input.linkedModuleId)
          )
        );
    }),

  modulesDelete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(tickets)
        .set({ moduleId: null })
        .where(eq(tickets.moduleId, input.id));

      await ctx.db
        .delete(modules)
        .where(and(eq(modules.id, input.id), eq(modules.orgId, ctx.session.orgId)));
    }),
});
