import { z } from "zod";
import { eq, and, desc, sql, ne, gt, inArray } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import {
  chatChannels,
  chatChannelMembers,
  chatMessages,
  users,
  organizationMembers,
} from "@/lib/db/schema";

export const channelRouter = createTRPCRouter({
  getMyChannels: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.userId;
    const orgId = ctx.session.orgId;

    try {
      // Get all channels the user is a member of
      const memberships = await ctx.db
        .select({ channelId: chatChannelMembers.channelId, lastReadAt: chatChannelMembers.lastReadAt })
        .from(chatChannelMembers)
        .where(eq(chatChannelMembers.userId, userId));

      if (memberships.length === 0) return [];

      const channelIds = memberships.map((m) => m.channelId);
      const lastReadMap = new Map(memberships.map((m) => [m.channelId, m.lastReadAt]));

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

      // Get last message + unread count for each channel (sequential to avoid pool exhaustion)
      const result = [];
      for (const ch of channels) {
        const lastReadAt = lastReadMap.get(ch.id) ?? new Date(0);

        let unreadCount = 0;
        try {
          const [unreadResult] = await ctx.db
            .select({ count: sql<number>`count(*)::int` })
            .from(chatMessages)
            .where(
              and(
                eq(chatMessages.channelId, ch.id),
                gt(chatMessages.createdAt, lastReadAt),
                ne(chatMessages.senderId, userId),
                eq(chatMessages.isDeleted, false)
              )
            );
          unreadCount = unreadResult?.count ?? 0;
        } catch {
          // Fallback to 0
        }

        let lastMessage: {
          content: string | null;
          senderName: string | null | undefined;
          createdAt: Date | null;
        } | null = null;

        try {
          const msg = await ctx.db.query.chatMessages.findFirst({
            where: and(
              eq(chatMessages.channelId, ch.id),
              eq(chatMessages.isDeleted, false)
            ),
            orderBy: [desc(chatMessages.createdAt)],
            with: { sender: { columns: { id: true, name: true } } },
          });

          if (msg) {
            lastMessage = {
              content: msg.content,
              senderName: msg.sender?.name,
              createdAt: msg.createdAt,
            };
          }
        } catch {
          // Fallback to null
        }

        result.push({
          ...ch,
          unreadCount,
          lastMessage,
        });
      }

      return result;
    } catch (error) {
      console.error("[chat.getMyChannels] Error:", error);
      return [];
    }
  }),

  getChannel: protectedProcedure
    .input(z.object({ channelId: z.number() }))
    .query(async ({ ctx, input }) => {
      const channel = await ctx.db.query.chatChannels.findFirst({
        where: eq(chatChannels.id, input.channelId),
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

  addMembers: protectedProcedure
    .input(z.object({ channelId: z.number(), userIds: z.string().array() }))
    .mutation(async ({ ctx, input }) => {
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
      const memberships = await ctx.db
        .select({ channelId: chatChannelMembers.channelId, lastReadAt: chatChannelMembers.lastReadAt })
        .from(chatChannelMembers)
        .where(eq(chatChannelMembers.userId, userId));

      if (memberships.length === 0) return 0;

      let total = 0;
      for (const m of memberships) {
        const lastReadAt = m.lastReadAt ?? new Date(0);
        try {
          const [result] = await ctx.db
            .select({ count: sql<number>`count(*)::int` })
            .from(chatMessages)
            .where(
              and(
                eq(chatMessages.channelId, m.channelId),
                gt(chatMessages.createdAt, lastReadAt),
                ne(chatMessages.senderId, userId),
                eq(chatMessages.isDeleted, false)
              )
            );
          total += result?.count ?? 0;
        } catch {
          // Skip this channel
        }
      }

      return total;
    } catch (error) {
      console.error("[chat.getUnreadTotal] Error:", error);
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
