import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { notifications } from "../../../lib/db/schema";

export const notificationsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(50).default(20),
      unreadOnly: z.boolean().default(false),
    }).optional())
    .query(async ({ ctx, input }) => {
      const filters = [
        eq(notifications.orgId, ctx.session.orgId),
        eq(notifications.userId, ctx.session.userId),
      ];
      if (input?.unreadOnly) {
        filters.push(eq(notifications.isRead, false));
      }

      return ctx.db.query.notifications.findMany({
        where: and(...filters),
        orderBy: [desc(notifications.createdAt)],
        limit: input?.limit ?? 20,
      });
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const [result] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.orgId, ctx.session.orgId),
        eq(notifications.userId, ctx.session.userId),
        eq(notifications.isRead, false),
      ));
    return { count: Number(result?.count || 0) };
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(notifications)
        .set({ isRead: true })
        .where(and(
          eq(notifications.id, input.id),
          eq(notifications.userId, ctx.session.userId),
        ));
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.orgId, ctx.session.orgId),
        eq(notifications.userId, ctx.session.userId),
        eq(notifications.isRead, false),
      ));
    return { success: true };
  }),
});
