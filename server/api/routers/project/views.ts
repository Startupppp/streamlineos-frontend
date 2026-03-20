import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { projectViews } from "../../../../lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const viewsRouter = createTRPCRouter({
  viewsGetByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(projectViews)
        .where(
          and(
            eq(projectViews.projectId, input.projectId),
            eq(projectViews.orgId, ctx.session.orgId)
          )
        )
        .orderBy(desc(projectViews.isPinned), projectViews.name);
    }),

  viewsGetById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [view] = await ctx.db
        .select()
        .from(projectViews)
        .where(and(eq(projectViews.id, input.id), eq(projectViews.orgId, ctx.session.orgId)));

      if (!view) throw new TRPCError({ code: "NOT_FOUND" });
      return view;
    }),

  viewsCreate: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        name: z.string().min(1).max(100),
        filters: z.record(z.string(), z.unknown()).default({}),
        groupBy: z.string().optional(),
        orderBy: z.string().optional(),
        layoutType: z.enum(["board", "list", "table", "calendar", "gantt"]).default("board"),
        isPinned: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [view] = await ctx.db
        .insert(projectViews)
        .values({
          projectId: input.projectId,
          orgId: ctx.session.orgId,
          createdBy: ctx.session.userId,
          name: input.name,
          filters: input.filters,
          groupBy: input.groupBy,
          orderBy: input.orderBy,
          layoutType: input.layoutType,
          isPinned: input.isPinned,
        })
        .returning();
      return view;
    }),

  viewsUpdate: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        filters: z.record(z.string(), z.unknown()).optional(),
        groupBy: z.string().nullable().optional(),
        orderBy: z.string().nullable().optional(),
        layoutType: z.enum(["board", "list", "table", "calendar", "gantt"]).optional(),
        isPinned: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(projectViews)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(projectViews.id, id), eq(projectViews.orgId, ctx.session.orgId)))
        .returning();
      return updated;
    }),

  viewsDelete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(projectViews)
        .where(and(eq(projectViews.id, input.id), eq(projectViews.orgId, ctx.session.orgId)));
    }),
});
