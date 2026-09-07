import { z } from "zod";

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
  type: z.enum(["PUBLIC", "PRIVATE", "DM", "GROUP"]),
  avatarUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  memberCount: z.number().int().optional(),
  members: z
    .array(
      z.object({
        id: z.number().int(),
        role: z.string(),
        user: z.object({
          id: z.string(),
          name: z.string().nullable(),
          image: z.string().nullable(),
          email: z.string(),
        }),
      }),
    )
    .optional(),
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

/** `iceServersResponseSchema` */
export const iceServersContract = z.object({
  iceServers: z.array(
    z.object({
      urls: z.array(z.string()),
      username: z.string().optional(),
      credential: z.string().optional(),
    }),
  ),
});

/** `aiConversationSchema` */
export const aiConversationContract = z.object({
  id: z.string(),
  orgId: z.string(),
  userId: z.string(),
  title: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** `listConversationsResponseSchema` */
export const aiConversationListContract = z.object({
  data: z.array(aiConversationContract),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

/** `chatHistoryResponseSchema` — conversation message history page. */
export const aiConversationMessagesContract = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      conversationId: z.string(),
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      createdAt: z.string(),
      aiUsage: z
        .object({ inputTokens: z.number().int(), outputTokens: z.number().int() })
        .optional(),
    }),
  ),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

/** `deleteConversationResponseSchema` */
export const aiDeleteConversationContract = z.object({ success: z.literal(true) });

/** chat attachment URL response */
export const chatAttachmentUrlContract = z.object({ url: z.string() });
