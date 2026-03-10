import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { notifications } from "../../../lib/db/schema";

export const notificationsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.query.notifications.findMany({
        where: and(
          eq(notifications.orgId, ctx.session.orgId),
          eq(notifications.userId, ctx.session.userId)
        ),
        orderBy: [desc(notifications.createdAt)],
        limit: input?.limit ?? 50,
      });
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const unread = await ctx.db.query.notifications.findMany({
      where: and(
        eq(notifications.orgId, ctx.session.orgId),
        eq(notifications.userId, ctx.session.userId),
        eq(notifications.isRead, false)
      ),
    });
    return unread.length;
  }),

  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(notifications)
        .set({ isRead: true })
        .where(and(
          eq(notifications.id, input.id),
          eq(notifications.userId, ctx.session.userId)
        ));
      return { success: true };
    }),

  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.orgId, ctx.session.orgId),
        eq(notifications.userId, ctx.session.userId),
        eq(notifications.isRead, false)
      ));
    return { success: true };
  }),
});
