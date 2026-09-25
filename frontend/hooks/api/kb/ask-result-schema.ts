import { z } from "zod";
import { aiResultUsageSchema } from "@/hooks/api/ai-result-stream-schema";

const citationFields = {
  title: z.string(),
  spaceId: z.number().nullable(),
  updatedAt: z.string(),
  passage: z.string().optional(),
  verified: z.boolean().optional(),
};

export const kbAskCitationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("article"), articleId: z.number(), slug: z.string(), ...citationFields }),
  z.object({ kind: z.literal("page"), pageId: z.number(), ...citationFields }),
  z.object({ kind: z.literal("source"), sourceId: z.number(), ...citationFields }),
  z.object({ kind: z.literal("document"), linkedDocumentId: z.number(), ...citationFields, spaceId: z.null() }),
]);

export type KbAskCitationWithParts = z.infer<typeof kbAskCitationSchema>;

export const kbAskResultSchema = z.object({
  answer: z.string(),
  citations: z.array(kbAskCitationSchema),
  hasContext: z.boolean(),
  conversationId: z.number(),
  disagreement: z.object({ summary: z.string() }).optional(),
  aiUsage: aiResultUsageSchema.nullable().optional(),
});

export type KbAskResult = z.infer<typeof kbAskResultSchema>;
