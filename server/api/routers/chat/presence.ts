import { z } from "zod";
import { eq, and, gt } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { chatUserPresence, users } from "@/lib/db/schema";

export const presenceRouter = createTRPCRouter({
  heartbeat: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.userId;
    const orgId = ctx.session.orgId;

    await ctx.db
      .insert(chatUserPresence)
      .values({ userId, orgId, status: "ONLINE", lastSeenAt: new Date() })
      .onConflictDoUpdate({
        target: chatUserPresence.userId,
        set: { status: "ONLINE", lastSeenAt: new Date() },
      });

    return { ok: true };
  }),

  setStatus: protectedProcedure
    .input(z.object({ status: z.enum(["ONLINE", "AWAY", "OFFLINE"]) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(chatUserPresence)
        .values({
          userId: ctx.session.userId,
          orgId: ctx.session.orgId,
          status: input.status,
          lastSeenAt: new Date(),
        })
        .onConflictDoUpdate({
          target: chatUserPresence.userId,
          set: { status: input.status, lastSeenAt: new Date() },
        });

      return { ok: true };
    }),

  getOnlineUsers: protectedProcedure.query(async ({ ctx }) => {
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);

    const online = await ctx.db
      .select({
        userId: chatUserPresence.userId,
        status: chatUserPresence.status,
        lastSeenAt: chatUserPresence.lastSeenAt,
        userName: users.name,
        userImage: users.image,
      })
      .from(chatUserPresence)
      .innerJoin(users, eq(chatUserPresence.userId, users.id))
      .where(
        and(
          eq(chatUserPresence.orgId, ctx.session.orgId),
          gt(chatUserPresence.lastSeenAt, twoMinAgo)
        )
      );

    return online;
  }),
});
