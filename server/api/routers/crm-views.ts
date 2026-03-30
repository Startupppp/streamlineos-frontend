import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { crmViews } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const crmViewsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({ entityType: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(crmViews.orgId, ctx.session.orgId)];
      if (input.entityType) conditions.push(eq(crmViews.entityType, input.entityType));

      return ctx.db
        .select()
        .from(crmViews)
        .where(and(...conditions))
        .orderBy(desc(crmViews.isPinned), crmViews.name);
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        entityType: z.string(),
        filters: z.record(z.string(), z.unknown()).default({}),
        sortBy: z.string().optional(),
        sortDir: z.string().default("asc"),
        isPublic: z.boolean().default(false),
        isPinned: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [view] = await ctx.db
        .insert(crmViews)
        .values({
          name: input.name,
          entityType: input.entityType,
          filters: input.filters,
          sortBy: input.sortBy,
          sortDir: input.sortDir,
          isPublic: input.isPublic,
          isPinned: input.isPinned,
          orgId: ctx.session.orgId,
          createdBy: ctx.session.userId,
        })
        .returning();
      return view;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        filters: z.record(z.string(), z.unknown()).optional(),
        sortBy: z.string().nullable().optional(),
        sortDir: z.string().optional(),
        isPublic: z.boolean().optional(),
        isPinned: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(crmViews)
        .set(data)
        .where(and(eq(crmViews.id, id), eq(crmViews.orgId, ctx.session.orgId)))
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(crmViews)
        .where(and(eq(crmViews.id, input.id), eq(crmViews.orgId, ctx.session.orgId)));
    }),
});
