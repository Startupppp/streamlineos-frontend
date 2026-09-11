import { z } from "zod";
import { chatChannelMemberContract } from "@/hooks/api/chat-schema";

/**
 * Supplementary chat contracts that reference shape from modules outside chat
 * (storage, realtime, AI) or that carry the full channel-detail projection.
 *
 * NOT `.strict()` — an added backend field is a backward-compatible deploy.
 */

/** Full channel-detail projection (single-channel GET). */
export const chatChannelDetailContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.enum(["PUBLIC", "PRIVATE", "DIRECT", "GROUP"]),
  avatarUrl: z.string().nullable(),
  isArchived: z.boolean(),
  entityType: z.string().nullable(),
  entityId: z.string().nullable(),
  unreadCount: z.number().int(),
  lastMessage: z.object({
    content: z.string().nullable(),
    senderName: z.string().nullable(),
    createdAt: z.string().nullable(),
  }).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  memberCount: z.number().int().optional(),
  members: z.array(chatChannelMemberContract),
});

/** `storageUploadResponseSchema` — quarantine record from the upload handler. */
export const storageUploadContract = z.object({
  quarantineId: z.string(),
  status: z.literal("pending_scan"),
  key: z.string(),
  mimeType: z.string(),
  size: z.number().int(),
  sha256: z.string(),
});

/** `aiConversationSchema` */
export const aiConversationContract = z.object({
  id: z.number().int(),
  title: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** `listConversationsResponseSchema` */
export const aiConversationListContract = z.object({
  conversations: z.array(aiConversationContract),
  nextCursor: z.number().int().nullable(),
});

/** `chatHistoryResponseSchema` — conversation message history page. */
export const aiConversationMessagesContract = z.object({
  messages: z.array(
    z.object({
      id: z.number().int(),
      conversationId: z.number().int(),
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      createdAt: z.string(),
      aiUsage: z
        .object({ inputTokens: z.number().int(), outputTokens: z.number().int() })
        .optional(),
    }),
  ),
  nextCursor: z.number().int().nullable(),
});

/** `deleteConversationResponseSchema` */
export const aiDeleteConversationContract = z.object({ success: z.literal(true) });

/** chat attachment URL response */
export const chatAttachmentUrlContract = z.object({ url: z.string() });
