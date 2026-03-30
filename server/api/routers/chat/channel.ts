import { z } from "zod";
import { eq, and, desc, sql, ne, gt, inArray } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  chatChannels,
  chatChannelMembers,
  chatMessages,
  users,
  organizationMembers,
} from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { TRPCError } from "@trpc/server";

/** Verify user is a member of the channel. Throws FORBIDDEN if not. */
async function verifyChannelMember(db: typeof import("@/lib/db").db, channelId: number, userId: string) {
  const member = await db.query.chatChannelMembers.findFirst({
    where: and(
      eq(chatChannelMembers.channelId, channelId),
      eq(chatChannelMembers.userId, userId)
    ),
  });
  if (!member) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this channel" });
  }
  return member;
}

export const channelRouter = createTRPCRouter({
  getMyChannels: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.userId;
    const orgId = ctx.session.orgId;

    try {
      const memberships = await ctx.db
        .select({ channelId: chatChannelMembers.channelId, lastReadAt: chatChannelMembers.lastReadAt })
        .from(chatChannelMembers)
        .where(eq(chatChannelMembers.userId, userId));

      if (memberships.length === 0) return [];

      const channelIds = memberships.map((m) => m.channelId);
      const lastReadMap = new Map(memberships.map((m) => [m.channelId, m.lastReadAt]));

      // 1. Fetch channels with members (single query)
      const channels = await ctx.db.query.chatChannels.findMany({
        where: and(
          eq(chatChannels.orgId, orgId),
          inArray(chatChannels.id, channelIds),
          eq(chatChannels.isArchived, false)
        ),
        orderBy: [desc(chatChannels.lastMessageAt)],
        with: {
          members: {
            with: { user: { columns: { id: true, name: true, image: true } } },
          },
        },
      });

      // 2. Batch unread counts in ONE query using CASE expressions
      const unreadRows = await ctx.db
        .select({
          channelId: chatMessages.channelId,
          count: sql<number>`count(*)::int`,
        })
        .from(chatMessages)
        .where(
          and(
            inArray(chatMessages.channelId, channelIds),
            ne(chatMessages.senderId, userId),
            eq(chatMessages.isDeleted, false),
            sql`${chatMessages.createdAt} > COALESCE((
              SELECT last_read_at FROM chat_channel_members
              WHERE channel_id = ${chatMessages.channelId} AND user_id = ${userId}
            ), '1970-01-01'::timestamp)`
          )
        )
        .groupBy(chatMessages.channelId);

      const unreadMap = new Map(unreadRows.map((r) => [r.channelId, r.count]));

      // 3. Batch last messages in ONE query using DISTINCT ON
      const lastMessages = await ctx.db.execute<{
        channel_id: number;
        content: string | null;
        sender_name: string | null;
        created_at: Date | null;
      }>(sql`
        SELECT DISTINCT ON (m.channel_id)
          m.channel_id,
          m.content,
          u.name AS sender_name,
          m.created_at
        FROM chat_messages m
        LEFT JOIN users u ON u.id = m.sender_id
        WHERE m.channel_id = ANY(${channelIds.map(Number)})
          AND m.is_deleted = false
        ORDER BY m.channel_id, m.created_at DESC
      `);

      // drizzle 0.45+ db.execute returns { rows: T[] } instead of T[]
      const lastMessageRows = (
        Array.isArray(lastMessages) ? lastMessages : (lastMessages as { rows: unknown[] }).rows ?? []
      ) as { channel_id: number; content: string | null; sender_name: string | null; created_at: Date | null }[];

      const lastMsgMap = new Map(
        lastMessageRows.map((r) => [
          r.channel_id,
          { content: r.content, senderName: r.sender_name, createdAt: r.created_at },
        ])
      );

      return channels.map((ch) => ({
        ...ch,
        unreadCount: unreadMap.get(ch.id) ?? 0,
        lastMessage: lastMsgMap.get(ch.id) ?? null,
      }));
    } catch (error) {
      logger.error("[chat.getMyChannels]", { path: "chat.getMyChannels", error: error instanceof Error ? error.message : "Unknown error" });
      return [];
    }
  }),

  getChannel: protectedProcedure
    .input(z.object({ channelId: z.number() }))
    .query(async ({ ctx, input }) => {
      await verifyChannelMember(ctx.db, input.channelId, ctx.session.userId);

      const channel = await ctx.db.query.chatChannels.findFirst({
        where: and(eq(chatChannels.id, input.channelId), eq(chatChannels.orgId, ctx.session.orgId)),
        with: {
          members: {
            with: { user: { columns: { id: true, name: true, image: true, email: true, role: true } } },
          },
        },
      });

      return channel ?? null;
    }),

  createDM: protectedProcedure
    .input(z.object({ targetUserId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.userId;
      const orgId = ctx.session.orgId;

      // Check if DM already exists between these two users
      const myChannels = await ctx.db
        .select({ channelId: chatChannelMembers.channelId })
        .from(chatChannelMembers)
        .where(eq(chatChannelMembers.userId, userId));

      if (myChannels.length > 0) {
        const channelIds = myChannels.map((c) => c.channelId);
        const existing = await ctx.db.query.chatChannels.findMany({
          where: and(
            inArray(chatChannels.id, channelIds),
            eq(chatChannels.type, "DIRECT"),
            eq(chatChannels.orgId, orgId)
          ),
          with: { members: true },
        });

        const dmChannel = existing.find((ch) =>
          ch.members.length === 2 &&
          ch.members.some((m) => m.userId === input.targetUserId)
        );

        if (dmChannel) return dmChannel;
      }

      // Create new DM
      const targetUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.targetUserId),
        columns: { name: true },
      });

      const currentUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { name: true },
      });

      const [channel] = await ctx.db
        .insert(chatChannels)
        .values({
          orgId,
          name: `${currentUser?.name ?? "User"} & ${targetUser?.name ?? "User"}`,
          type: "DIRECT",
          createdBy: userId,
        })
        .returning();

      await ctx.db.insert(chatChannelMembers).values([
        { channelId: channel.id, userId, role: "MEMBER" },
        { channelId: channel.id, userId: input.targetUserId, role: "MEMBER" },
      ]);

      return channel;
    }),

  createGroup: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        avatarUrl: z.string().optional(),
        memberIds: z.string().array().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.userId;
      const orgId = ctx.session.orgId;

      const [channel] = await ctx.db
        .insert(chatChannels)
        .values({
          orgId,
          name: input.name,
          type: "GROUP",
          description: input.description,
          avatarUrl: input.avatarUrl,
          createdBy: userId,
        })
        .returning();

      const allMembers = [...new Set([userId, ...input.memberIds])];
      await ctx.db.insert(chatChannelMembers).values(
        allMembers.map((uid) => ({
          channelId: channel.id,
          userId: uid,
          role: uid === userId ? "ADMIN" as const : "MEMBER" as const,
        }))
      );

      return channel;
    }),

  updateChannel: protectedProcedure
    .input(
      z.object({
        channelId: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        avatarUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only admins of the channel can update
      const membership = await ctx.db.query.chatChannelMembers.findFirst({
        where: and(
          eq(chatChannelMembers.channelId, input.channelId),
          eq(chatChannelMembers.userId, ctx.session.userId)
        ),
      });

      if (!membership || membership.role !== "ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only channel admins can update channel details" });
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.avatarUrl !== undefined) updateData.avatarUrl = input.avatarUrl;

      await ctx.db
        .update(chatChannels)
        .set(updateData)
        .where(eq(chatChannels.id, input.channelId));

      return { ok: true };
    }),

  addMembers: protectedProcedure
    .input(z.object({ channelId: z.number(), userIds: z.string().array() }))
    .mutation(async ({ ctx, input }) => {
      const member = await verifyChannelMember(ctx.db, input.channelId, ctx.session.userId);
      if (member.role !== "ADMIN") throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can add members" });

      await ctx.db.insert(chatChannelMembers).values(
        input.userIds.map((uid) => ({
          channelId: input.channelId,
          userId: uid,
          role: "MEMBER" as const,
        }))
      ).onConflictDoNothing();

      return { ok: true };
    }),

  removeMember: protectedProcedure
    .input(z.object({ channelId: z.number(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const member = await verifyChannelMember(ctx.db, input.channelId, ctx.session.userId);
      // Allow admins to remove anyone, or users to remove themselves
      if (member.role !== "ADMIN" && input.userId !== ctx.session.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can remove other members" });
      }

      await ctx.db
        .delete(chatChannelMembers)
        .where(
          and(
            eq(chatChannelMembers.channelId, input.channelId),
            eq(chatChannelMembers.userId, input.userId)
          )
        );

      return { ok: true };
    }),

  leaveChannel: protectedProcedure
    .input(z.object({ channelId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(chatChannelMembers)
        .where(
          and(
            eq(chatChannelMembers.channelId, input.channelId),
            eq(chatChannelMembers.userId, ctx.session.userId)
          )
        );

      return { ok: true };
    }),

  getUnreadTotal: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.userId;

    try {
      const [result] = await ctx.db.execute<{ total: number }>(sql`
        SELECT COALESCE(SUM(unread), 0)::int AS total
        FROM (
          SELECT COUNT(m.id) AS unread
          FROM chat_channel_members ccm
          JOIN chat_messages m
            ON m.channel_id = ccm.channel_id
            AND m.created_at > COALESCE(ccm.last_read_at, '1970-01-01'::timestamp)
            AND m.sender_id != ${userId}
            AND m.is_deleted = false
          WHERE ccm.user_id = ${userId}
          GROUP BY ccm.channel_id
        ) sub
      `);
      return (result as { total: number } | undefined)?.total ?? 0;
    } catch (error) {
      logger.error("[chat.getUnreadTotal]", { path: "chat.getUnreadTotal", error: error instanceof Error ? error.message : "Unknown error" });
      return 0;
    }
  }),

  getOrgUsers: protectedProcedure.query(async ({ ctx }) => {
    const orgUsers = await ctx.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
        role: users.role,
      })
      .from(users)
      .innerJoin(organizationMembers, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(users.isActive, true),
          ne(users.id, ctx.session.userId),
          eq(organizationMembers.orgId, ctx.session.orgId)
        )
      );

    return orgUsers;
  }),
});
