import { z } from "zod";

import { chatMemberUserContract, chatPreviewUserContract } from "./user-schema";

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
  lastReadAt: z.string().nullable(),
  joinedAt: z.string(),
  archivedAt: z.string().nullable(),
};

const channelMemberBase = { ...channelMemberListBase, ...channelMemberDetailExtra };

export const chatChannelMemberPreviewContract = z
  .object({ ...channelMemberListBase, user: chatPreviewUserContract.nullable() })
  .strict();

export const chatChannelMemberContract = z
  .object({ ...channelMemberBase, user: chatMemberUserContract.nullable() })
  .strict();

const chatLastMessageContract = z
  .object({
    content: z.string().nullable(),
    senderName: z.string().nullable(),
    createdAt: z.string(),
  })
  .strict();

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

export function chatChannelPageContract<T extends z.ZodTypeAny>(row: T) {
  return z.object({
    channels: z.array(row),
    nextCursor: z.string().nullable(),
  });
}

export type ChatChannelMemberWire = z.infer<typeof chatChannelMemberContract>;
