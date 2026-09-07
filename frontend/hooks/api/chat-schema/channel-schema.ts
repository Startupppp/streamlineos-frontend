import { z } from "zod";

import { chatMemberUserContract, chatPreviewUserContract } from "./user-schema";

/**
 * `userId` and `user` are nullable — not optional. A member whose
 * `organization_members` row is gone flattens to nulls rather than to missing
 * keys, and that distinction is the whole defect: the broken payload had no
 * `user` key at all, which a required-nullable field rejects and an optional one
 * would have waved through.
 *
 * `orgId` and `membershipId` are absent on purpose — the caller's tenant is already the only
 * one it can read, and the membership id is an internal join key.
 *
 * The list preview and the detail route emit different key sets. `channelMemberListBase` carries
 * only the eight fields the sidebar actually reads; `channelMemberDetailExtra` adds the three
 * fields (`lastReadAt`, `joinedAt`, `archivedAt`) that only the channel detail panel and the
 * message-panel data hook consume, via `GET /chat/channels/:channelId`.
 */
const channelMemberListBase = {
  id: z.number(),
  channelId: z.number(),
  userId: z.string().nullable(),
  role: z.enum(["ADMIN", "MEMBER"]),
  mutedUntil: z.string().nullable(),
  isFavorite: z.boolean(),
  notificationPreference: z.enum(["DEFAULT", "ALL", "MENTIONS", "NOTHING"]),
};

const channelMemberDetailExtra = {
  lastReadAt: z.string(),
  joinedAt: z.string(),
  archivedAt: z.string().nullable(),
};

const channelMemberBase = { ...channelMemberListBase, ...channelMemberDetailExtra };

/** The channel-list preview row: eight columns, `user` without `email`, no date-string timestamps. */
export const chatChannelMemberPreviewContract = z
  .object({ ...channelMemberListBase, user: chatPreviewUserContract.nullable() })
  .strict();

/** The members and channel-detail rows: full nine columns, `user` carries the address as well. */
export const chatChannelMemberContract = z
  .object({ ...channelMemberBase, user: chatMemberUserContract.nullable() })
  .strict();

export const chatLastMessageContract = z
  .object({
    content: z.string().nullable(),
    senderName: z.string().nullable(),
    createdAt: z.string(),
  })
  .strict();

/**
 * A channel list row is `CHANNEL_LIST_COLUMNS` plus exactly four computed keys.
 *
 * Six fields removed in the 2026-09-06 budget fix — none are rendered by sidebar list components:
 * `orgId` (read from the session, never from the channel object in any list component),
 * `description` (channel info panel only, via the detail route),
 * `isPrivate` (no chat list/sidebar component reads it),
 * `lastMessageAt` (cursor is encoded from a separate id query; nothing renders this column),
 * `createdAt` (channel info panel only, via the detail route),
 * `updatedAt` (nothing renders it).
 *
 * `createdBy` is NOT among them, and never was: `chat_channels` has no
 * `created_by` column — only `created_by_membership_id`, which
 * `CHANNEL_LIST_COLUMNS` deliberately omits. `types/chat.ts` declared
 * `createdBy: string` regardless, and no component ever read it. That is an
 * eighth instance of the same class, found by writing this contract; the field
 * is removed rather than declared here, because declaring it would make the
 * contract satisfiable and false at the same time.
 */
export const chatChannelContract = z
  .object({
    id: z.number(),
    name: z.string(),
    type: z.enum(["DIRECT", "GROUP", "PUBLIC", "PRIVATE"]),
    avatarUrl: z.string().nullable(),
    isArchived: z.boolean(),
    entityType: z.string().nullable(),
    entityId: z.string().nullable(),
    members: z.array(chatChannelMemberPreviewContract),
    memberCount: z.number(),
    membersTruncated: z.boolean(),
    unreadCount: z.number(),
    lastMessage: chatLastMessageContract.nullable(),
  })
  .strict();

/**
 * `listPublicChannels` builds its row with an explicit `db.select({...})` of
 * seven columns and adds `memberCount` and `isMember`. It carries no members
 * array and no unread count.
 */
export const chatPublicChannelContract = z
  .object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    type: z.enum(["DIRECT", "GROUP", "PUBLIC", "PRIVATE"]),
    createdAt: z.string(),
    lastMessageAt: z.string(),
    memberCount: z.number(),
    isMember: z.boolean(),
  })
  .strict();

/**
 * The keyset page every channel list route answers.
 *
 * Left non-`.strict()`: the page envelope is the one place a future field
 * (`total`, `hasMore`) is a genuinely compatible addition, and it carries no
 * identity of its own.
 */
export function chatChannelPageContract<T extends z.ZodTypeAny>(row: T) {
  return z.object({
    channels: z.array(row),
    nextCursor: z.string().nullable(),
  });
}

export type ChatChannelWire = z.infer<typeof chatChannelContract>;
export type ChatChannelMemberWire = z.infer<typeof chatChannelMemberContract>;
export type ChatPublicChannelWire = z.infer<typeof chatPublicChannelContract>;
