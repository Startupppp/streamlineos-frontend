import { z } from "zod";
import { aiResultUsageSchema } from "@/hooks/api/ai-result-stream-schema";

const kbAskPageOwnerSchema = z.object({
  membershipId: z.number().int(),
  name: z.string(),
}).strict();

export const kbAskPageOwnersContract = z.object({
  data: z.array(kbAskPageOwnerSchema),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }).strict(),
  selected: kbAskPageOwnerSchema.nullable(),
}).strict();

export type KbAskPageOwner = z.infer<typeof kbAskPageOwnerSchema>;
export type KbAskPageOwnersPage = z.infer<typeof kbAskPageOwnersContract>;

const citationFields = {
  title: z.string(),
  spaceId: z.number().nullable(),
  updatedAt: z.string(),
  passage: z.string().optional(),
  verified: z.boolean().optional(),
};

export const kbAskCitationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("article"), articleId: z.number(), slug: z.string(), ...citationFields }).strict(),
  z.object({ kind: z.literal("page"), pageId: z.number(), ...citationFields }).strict(),
  z.object({ kind: z.literal("source"), sourceId: z.number(), ...citationFields }).strict(),
  z.object({ kind: z.literal("document"), linkedDocumentId: z.number(), ...citationFields, spaceId: z.null() }).strict(),
]);

export type KbAskCitationWithParts = z.infer<typeof kbAskCitationSchema>;

export const kbAskResultSchema = z.object({
  answer: z.string(),
  citations: z.array(kbAskCitationSchema),
  hasContext: z.boolean(),
  conversationId: z.number(),
  disagreement: z.object({ summary: z.string() }).strict().optional(),
  aiUsage: aiResultUsageSchema.nullable().optional(),
}).strict();

export type KbAskResult = z.infer<typeof kbAskResultSchema>;
