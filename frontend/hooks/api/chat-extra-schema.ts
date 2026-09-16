import { z } from "zod";
import { chatChannelMemberContract } from "@/hooks/api/chat-schema";

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
  isPinned: z.boolean(),
  isPrivate: z.boolean(),
  messageCount: z.number().int(),
  lastMessageAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  memberCount: z.number().int().optional(),
  members: z.array(chatChannelMemberContract),
});

export type ChatChannelDetailWire = z.infer<typeof chatChannelDetailContract>;

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
