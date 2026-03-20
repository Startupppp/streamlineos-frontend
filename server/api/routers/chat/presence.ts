import { z } from "zod";
import { eq, and, gt } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { chatUserPresence, users } from "@/lib/db/schema";

// In-memory typing state: channelId -> Map<userId, { name, expiresAt }>
const typingState = new Map<number, Map<string, { name: string; expiresAt: number }>>();

function cleanExpired(channelId: number) {
  const channel = typingState.get(channelId);
  if (!channel) return;
  const now = Date.now();
  for (const [uid, entry] of channel) {
    if (entry.expiresAt <= now) channel.delete(uid);
  }
  if (channel.size === 0) typingState.delete(channelId);
}

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
    const oneMinAgo = new Date(Date.now() - 60 * 1000);

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
          gt(chatUserPresence.lastSeenAt, oneMinAgo)
        )
      );

    return online;
  }),

  setTyping: protectedProcedure
    .input(z.object({ channelId: z.number() }))
    .mutation(({ ctx, input }) => {
      const { channelId } = input;
      const userId = ctx.session.userId;
      const userName = ctx.session.user.name ?? "Someone";

      if (!typingState.has(channelId)) {
        typingState.set(channelId, new Map());
      }
      typingState.get(channelId)!.set(userId, {
        name: userName,
        expiresAt: Date.now() + 4000, // expires in 4s
      });

      return { ok: true };
    }),

  getTyping: protectedProcedure
    .input(z.object({ channelId: z.number() }))
    .query(({ ctx, input }) => {
      const { channelId } = input;
      const currentUserId = ctx.session.userId;

      cleanExpired(channelId);
      const channel = typingState.get(channelId);
      if (!channel) return [];

      const typers: { userId: string; name: string }[] = [];
      for (const [uid, entry] of channel) {
        if (uid !== currentUserId) {
          typers.push({ userId: uid, name: entry.name });
        }
      }
      return typers;
    }),
});
