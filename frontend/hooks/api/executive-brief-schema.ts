import { z } from "zod";

export const briefCitationSchema = z.object({
  id: z.string(),
  title: z.string(),
  href: z.string().regex(/^\/(?![/\\])[^\\\s\u0000-\u001f\u007f]*$/),
});

export const briefCitationsSchema = z.array(briefCitationSchema);

export type BriefCitation = z.infer<typeof briefCitationSchema>;

const executiveBriefSnapshotSchema = z.object({
  narrative: z.string(),
  citations: briefCitationsSchema,
  uncertaintyNotes: z.array(z.string()),
  generatedAt: z.string(),
  aiUsage: z.object({
    model: z.string(),
    promptTokens: z.number().int(),
    completionTokens: z.number().int(),
    totalTokens: z.number().int(),
    credits: z.number(),
    costUsd: z.number(),
  }).nullable(),
});

export const executiveBriefGetLatestContract = z.object({
  snapshot: executiveBriefSnapshotSchema.nullable(),
  isStale: z.boolean(),
  staleSinceMinutes: z.number().int().optional(),
});
