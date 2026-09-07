import { z } from "zod";

const aiUsageMetaContract = z.object({
  model: z.string(),
  promptTokens: z.number().int(),
  completionTokens: z.number().int(),
  totalTokens: z.number().int(),
  credits: z.number(),
  costUsd: z.number(),
});

export const kbPageAiBufferedContract = z.object({
  text: z.string(),
  aiUsage: aiUsageMetaContract.optional(),
});

export const kbArticleAiBufferedContract = z.object({
  text: z.string(),
  aiUsage: aiUsageMetaContract.optional(),
});

export const kbAiAskAnswerContract = z.object({
  answer: z.string(),
  sources: z.array(
    z.object({
      id: z.number().int(),
      title: z.string(),
      icon: z.string().nullable(),
      snippet: z.string().nullable(),
    }),
  ),
  aiUsage: aiUsageMetaContract.optional(),
  conversationId: z.string().nullable(),
});

export const kbAiFeedbackContract = z.object({ success: z.boolean() });

export const kbArticleSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  spaceId: z.number().int().nullable(),
  title: z.string(),
  slug: z.string(),
  content: z.string().nullable(),
  summary: z.string().nullable(),
  status: z.string(),
  views: z.number().int(),
  helpfulCount: z.number().int(),
  notHelpfulCount: z.number().int(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const kbArticleWithTagsContract = kbArticleSchema.extend({
  tags: z.array(z.object({ id: z.number().int(), name: z.string(), slug: z.string() })),
});
