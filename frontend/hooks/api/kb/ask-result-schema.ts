import { z } from "zod";
import { aiResultUsageSchema } from "@/hooks/api/ai-result-stream-schema";

const citationFields = { title: z.string(), spaceId: z.number().nullable(), updatedAt: z.string() };
export const kbAskCitationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("article"), articleId: z.number(), slug: z.string(), ...citationFields }),
  z.object({ kind: z.literal("page"), pageId: z.number(), ...citationFields }),
  z.object({ kind: z.literal("source"), sourceId: z.number(), ...citationFields }),
  z.object({ kind: z.literal("document"), linkedDocumentId: z.number(), ...citationFields, spaceId: z.null() }),
]);
export const kbAskResultSchema = z.object({
  answer: z.string(),
  citations: z.array(kbAskCitationSchema),
  hasContext: z.boolean(),
  conversationId: z.number(),
  aiUsage: aiResultUsageSchema.nullable().optional(),
});
