import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { pages } from "../../../../lib/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const pagesRouter = createTRPCRouter({
  pagesGetByProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(pages)
        .where(
          and(
            eq(pages.projectId, input.projectId),
            eq(pages.orgId, ctx.session.orgId)
          )
        )
        .orderBy(asc(pages.title));
    }),

  pagesGetTree: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const allPages = await ctx.db
        .select()
        .from(pages)
        .where(
          and(
            eq(pages.projectId, input.projectId),
            eq(pages.orgId, ctx.session.orgId)
          )
        )
        .orderBy(asc(pages.title));

      const rootPages = allPages.filter((p) => !p.parentPageId);
      const buildTree = (parentId: number | null): typeof allPages => {
        return allPages
          .filter((p) => p.parentPageId === parentId)
          .map((p) => ({ ...p, children: buildTree(p.id) } as typeof allPages[0] & { children: typeof allPages }));
      };

      return rootPages.map((p) => ({
        ...p,
        children: buildTree(p.id),
      }));
    }),

  pagesGetById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [page] = await ctx.db
        .select()
        .from(pages)
        .where(and(eq(pages.id, input.id), eq(pages.orgId, ctx.session.orgId)));

      if (!page) throw new TRPCError({ code: "NOT_FOUND" });
      return page;
    }),

  pagesCreate: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        title: z.string().min(1).max(200),
        content: z.unknown().optional(),
        icon: z.string().optional(),
        parentPageId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [page] = await ctx.db
        .insert(pages)
        .values({
          projectId: input.projectId,
          orgId: ctx.session.orgId,
          title: input.title,
          content: input.content ?? null,
          icon: input.icon,
          parentPageId: input.parentPageId,
          createdBy: ctx.session.userId,
        })
        .returning();
      return page;
    }),

  pagesUpdate: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(200).optional(),
        content: z.unknown().optional(),
        icon: z.string().nullable().optional(),
        coverImage: z.string().nullable().optional(),
        isPublic: z.boolean().optional(),
        isPinned: z.boolean().optional(),
        parentPageId: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(pages)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(pages.id, id), eq(pages.orgId, ctx.session.orgId)))
        .returning();
      return updated;
    }),

  pagesDelete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(pages)
        .set({ parentPageId: null })
        .where(eq(pages.parentPageId, input.id));

      await ctx.db
        .delete(pages)
        .where(and(eq(pages.id, input.id), eq(pages.orgId, ctx.session.orgId)));
    }),
});
