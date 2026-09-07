import { z } from "zod";

const kbConversationContract = z.object({
  id: z.string(),
  orgId: z.string(),
  userId: z.string().nullable(),
  title: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messageCount: z.number().int(),
});

export const kbConversationListPageContract = z.object({
  data: z.array(kbConversationContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const kbConversationResponseContract = kbConversationContract;

const kbChatMessageContract = z.object({
  id: z.string(),
  conversationId: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  sources: z.array(z.record(z.string(), z.unknown())).nullable(),
  createdAt: z.string(),
});

export const kbChatHistoryPageContract = z.object({
  data: z.array(kbChatMessageContract),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const kbChatSuccessContract = z.object({ success: z.boolean() });
