"server-only";

/**
 * Chat domain — pure DB query functions.
 * Imported only by /api/v1/chat/* route handlers (server-side).
 */

import { db } from "@/lib/db";
import {
  chatChannels,
  chatChannelMembers,
  chatMessages,
  chatUserPresence,
  users,
  organizationMembers,
} from "@/lib/db/schema";
import { eq, and, desc, gt, ilike, inArray, ne, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

// ─── In-memory typing state ───────────────────────────────────────────────────
// Kept here (module-level singleton) so it survives across requests in the same
// Node.js process, exactly mirroring the tRPC presence router behaviour.
const typingState = new Map<number, Map<string, { name: string; expiresAt: number }>>();

function cleanExpiredTypers(channelId: number) {
  const channel = typingState.get(channelId);
  if (!channel) return;
  const now = Date.now();
  for (const [uid, entry] of channel) {
    if (entry.expiresAt <= now) channel.delete(uid);
  }
  if (channel.size === 0) typingState.delete(channelId);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Throws an Error with a 403-friendly message when user is not a channel member. */
async function assertChannelMember(channelId: number, userId: string) {
  const member = await db.query.chatChannelMembers.findFirst({
    where: and(
      eq(chatChannelMembers.channelId, channelId),
      eq(chatChannelMembers.userId, userId)
    ),
  });
  if (!member) {
    const e = new Error("You are not a member of this channel");
    (e as NodeJS.ErrnoException).code = "FORBIDDEN";
    throw e;
  }
  return member;
}

// ─── Channel queries ──────────────────────────────────────────────────────────

/**
 * Returns all non-archived channels the user belongs to, enriched with
 * unread counts and the last message preview.
 */
export async function getMyChannels(userId: string, orgId: string) {
  try {
    const memberships = await db
      .select({ channelId: chatChannelMembers.channelId, lastReadAt: chatChannelMembers.lastReadAt })
      .from(chatChannelMembers)
      .where(eq(chatChannelMembers.userId, userId));

    if (memberships.length === 0) return [];

    const channelIds = memberships.map((m) => m.channelId);

    // 1. Fetch channels with members in a single query
    const channels = await db.query.chatChannels.findMany({
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

    // 2. Batch unread counts in ONE query
    const unreadRows = await db
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

    // 3. Batch last messages via DISTINCT ON
    const channelIdArray = channelIds.map(Number);
    const lastMessages = await db.execute<{
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
      WHERE m.channel_id = ANY(${sql`ARRAY[${sql.join(channelIdArray.map((id) => sql`${id}`), sql`, `)}]::int[]`})
        AND m.is_deleted = false
      ORDER BY m.channel_id, m.created_at DESC
    `);

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
    logger.error("[chat.getMyChannels]", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return [];
  }
}

/**
 * Returns a single channel (with members) if the requesting user is a member.
 * Returns null if not found or the user is not a member.
 */
export async function getChannel(channelId: number, userId: string) {
  await assertChannelMember(channelId, userId);

  const channel = await db.query.chatChannels.findFirst({
    where: eq(chatChannels.id, channelId),
    with: {
      members: {
        with: {
          user: { columns: { id: true, name: true, image: true, email: true, role: true } },
        },
      },
    },
  });

  return channel ?? null;
}

/**
 * Returns paginated messages for a channel (oldest-first for display).
 * The caller must have already verified membership.
 */
export async function getMessages(channelId: number, cursor?: number, limit = 50) {
  const safeLimit = Math.min(Math.max(1, limit), 100);

  const conditions = [eq(chatMessages.channelId, channelId)];
  if (cursor) {
    conditions.push(sql`${chatMessages.id} < ${cursor}`);
  }

  const messages = await db.query.chatMessages.findMany({
    where: and(...conditions),
    orderBy: [desc(chatMessages.createdAt)],
    limit: safeLimit + 1,
    with: {
      sender: { columns: { id: true, name: true, image: true } },
      attachments: true,
      replyTo: {
        with: { sender: { columns: { id: true, name: true } } },
      },
    },
  });

  let nextCursor: number | undefined;
  if (messages.length > safeLimit) {
    const next = messages.pop();
    nextCursor = next?.id;
  }

  return {
    messages: messages.reverse(),
    nextCursor,
  };
}

/**
 * Returns messages created after `since` (ISO timestamp) — used for polling.
 */
export async function pollMessages(channelId: number, since: string, userId: string) {
  await assertChannelMember(channelId, userId);
  const sinceDate = new Date(since);

  const newMessages = await db.query.chatMessages.findMany({
    where: and(
      eq(chatMessages.channelId, channelId),
      gt(chatMessages.createdAt, sinceDate)
    ),
    orderBy: [desc(chatMessages.createdAt)],
    limit: 100,
    with: {
      sender: { columns: { id: true, name: true, image: true } },
      attachments: true,
      replyTo: {
        with: { sender: { columns: { id: true, name: true } } },
      },
    },
  });

  return newMessages.reverse();
}

/**
 * Returns the total number of unread messages across all channels for a user.
 */
export async function getUnreadTotal(userId: string) {
  try {
    const [result] = await db.execute<{ total: number }>(sql`
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
    logger.error("[chat.getUnreadTotal]", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return 0;
  }
}

// ─── Presence queries ─────────────────────────────────────────────────────────

/**
 * Returns users who have been seen within the last 60 seconds in the given org.
 */
export async function getOnlineUsers(orgId: string) {
  const oneMinAgo = new Date(Date.now() - 60 * 1000);

  return db
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
        eq(chatUserPresence.orgId, orgId),
        gt(chatUserPresence.lastSeenAt, oneMinAgo)
      )
    );
}

/**
 * Upserts the user's presence record (heartbeat).
 */
export async function upsertPresence(userId: string, orgId: string) {
  await db
    .insert(chatUserPresence)
    .values({ userId, orgId, status: "ONLINE", lastSeenAt: new Date() })
    .onConflictDoUpdate({
      target: chatUserPresence.userId,
      set: { status: "ONLINE", lastSeenAt: new Date() },
    });
}

// ─── Org users query ─────────────────────────────────────────────────────────

/**
 * Returns all active org members except the requesting user — used for DM creation.
 */
export async function getOrgUsers(userId: string, orgId: string) {
  return db
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
        ne(users.id, userId),
        eq(organizationMembers.orgId, orgId)
      )
    );
}

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * Full-text (ILIKE) search across messages the user has access to.
 */
export async function searchMessages(
  userId: string,
  query: string,
  channelId?: number,
  limit = 20
) {
  const myChannels = await db
    .select({ channelId: chatChannelMembers.channelId })
    .from(chatChannelMembers)
    .where(eq(chatChannelMembers.userId, userId));

  const myChannelIds = myChannels.map((c) => c.channelId);
  if (myChannelIds.length === 0) return [];

  const safeQuery = query.replace(/[%_\\]/g, "\\$&");
  const conditions = [
    ilike(chatMessages.content, `%${safeQuery}%`),
    eq(chatMessages.isDeleted, false),
    inArray(chatMessages.channelId, myChannelIds),
  ];

  if (channelId) {
    conditions.push(eq(chatMessages.channelId, channelId));
  }

  return db.query.chatMessages.findMany({
    where: and(...conditions),
    orderBy: [desc(chatMessages.createdAt)],
    limit: Math.min(limit, 50),
    with: {
      sender: { columns: { id: true, name: true, image: true } },
      channel: { columns: { id: true, name: true, type: true } },
    },
  });
}

// ─── Typing indicators ────────────────────────────────────────────────────────

/**
 * Records the user as currently typing in a channel (expires in 4 s).
 */
export function setTypingIndicator(channelId: number, userId: string, userName: string) {
  if (!typingState.has(channelId)) {
    typingState.set(channelId, new Map());
  }
  typingState.get(channelId)!.set(userId, {
    name: userName,
    expiresAt: Date.now() + 4_000,
  });
}

/**
 * Returns the list of users currently typing in a channel (excludes the caller).
 */
export function getTypingIndicators(channelId: number, currentUserId: string) {
  cleanExpiredTypers(channelId);
  const channel = typingState.get(channelId);
  if (!channel) return [];

  const typers: { userId: string; name: string }[] = [];
  for (const [uid, entry] of channel) {
    if (uid !== currentUserId) {
      typers.push({ userId: uid, name: entry.name });
    }
  }
  return typers;
}
