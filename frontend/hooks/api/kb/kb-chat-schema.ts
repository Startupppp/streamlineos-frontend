import { z } from "zod";

const kbAskCitationContract = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("article"),
    articleId: z.number().int(),
    slug: z.string(),
    title: z.string(),
    spaceId: z.number().int().nullable(),
    updatedAt: z.string(),
  }),
  z.object({
    kind: z.literal("page"),
    pageId: z.number().int(),
    title: z.string(),
    spaceId: z.number().int().nullable(),
    updatedAt: z.string(),
  }),
  z.object({
    kind: z.literal("source"),
    sourceId: z.number().int(),
    title: z.string(),
    spaceId: z.number().int().nullable(),
    updatedAt: z.string(),
  }),
  z.object({
    kind: z.literal("document"),
    linkedDocumentId: z.number().int(),
    title: z.string(),
    spaceId: z.null(),
    updatedAt: z.string(),
  }),
]);

const kbConversationContract = z.object({
  id: z.number().int(),
  title: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const kbConversationListPageContract = z.object({
  conversations: z.array(kbConversationContract),
  nextCursor: z.number().int().nullable(),
});

export const kbConversationResponseContract = kbConversationContract;

const kbChatMessageContract = z.object({
  id: z.number().int(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  citations: z.array(kbAskCitationContract).nullable(),
  createdAt: z.string(),
});

export const kbChatHistoryPageContract = z.object({
  messages: z.array(kbChatMessageContract),
  nextCursor: z.number().int().nullable(),
});

export const kbChatSuccessContract = z.object({ success: z.boolean() });
