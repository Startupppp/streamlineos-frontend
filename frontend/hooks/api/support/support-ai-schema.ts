import { z } from "zod";

export const supportAiSuggestionRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  ticketId: z.number(),
  type: z.enum([
    "summary", "sentiment", "category", "priority", "spam",
    "reply", "macro", "kb_article", "duplicate", "handoff_summary", "root_cause_cluster",
  ]),
  payload: z.record(z.string(), z.unknown()),
  confidence: z.string().nullable(),
  status: z.enum(["pending", "accepted", "rejected"]),
  feedback: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  resolvedBy: z.string().nullable(),
  createdAt: z.string(),
});

export const supportAiSuggestionListContract = z.array(supportAiSuggestionRowContract);

export const supportAiSuggestionNullableContract = supportAiSuggestionRowContract.nullable();

export const supportAiTranslationContract = z.object({
  translatedText: z.string(),
  detectedSourceLanguage: z.string(),
}).nullable();

export const supportAiImproveReplyContract = z.object({
  improved: z.string(),
  changes: z.array(z.string()),
}).nullable();

export const supportAiReportContract = z.object({
  acceptanceRate: z.number(),
  resolutionRate: z.number(),
  reopenRate: z.number(),
  escalationRate: z.number(),
  sourceCoverage: z.number(),
  unsupportedRate: z.number(),
  csatImpact: z.object({
    aiResolved: z.number().nullable(),
    nonAiResolved: z.number().nullable(),
  }).nullable(),
});
