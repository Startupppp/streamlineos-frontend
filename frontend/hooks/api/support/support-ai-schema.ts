import { z } from "zod";

const suggestionBaseContract = {
  id: z.number(),
  orgId: z.string(),
  ticketId: z.number(),
  confidence: z.string().nullable(),
  status: z.enum(["pending", "accepted", "rejected"]),
  feedback: z.enum(["helpful", "not_helpful"]).nullable(),
  resolvedAt: z.string().nullable(),
  resolvedBy: z.string().nullable(),
  createdAt: z.string(),
};

export const aiReplySourceContract = z.object({
  title: z.string(),
  url: z.string(),
  articleId: z.number(),
});

export const supportAiSuggestionRowContract = z.discriminatedUnion("type", [
  z.object({
    ...suggestionBaseContract,
    type: z.literal("summary"),
    payload: z.object({ text: z.string() }),
  }),
  z.object({
    ...suggestionBaseContract,
    type: z.literal("sentiment"),
    payload: z.object({ sentiment: z.enum(["positive", "neutral", "negative"]) }),
  }),
  z.object({
    ...suggestionBaseContract,
    type: z.literal("category"),
    payload: z.object({ category: z.string() }),
  }),
  z.object({
    ...suggestionBaseContract,
    type: z.literal("priority"),
    payload: z.object({ priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]) }),
  }),
  z.object({
    ...suggestionBaseContract,
    type: z.literal("spam"),
    payload: z.object({ isSpam: z.literal(true) }),
  }),
  z.object({
    ...suggestionBaseContract,
    type: z.literal("reply"),
    payload: z.object({
      body: z.string(),
      sources: z.array(aiReplySourceContract).optional(),
      escalated: z.boolean().optional(),
    }),
  }),
  z.object({
    ...suggestionBaseContract,
    type: z.literal("macro"),
    payload: z.object({ macroId: z.number(), reason: z.string() }),
  }),
  z.object({
    ...suggestionBaseContract,
    type: z.literal("kb_article"),
    payload: z.object({
      articles: z.array(
        z.object({
          articleId: z.number(),
          title: z.string(),
          slug: z.string(),
          similarity: z.number(),
        }),
      ),
    }),
  }),
  z.object({
    ...suggestionBaseContract,
    type: z.literal("duplicate"),
    payload: z.object({ candidateTicketId: z.number(), title: z.string() }),
  }),
  z.object({
    ...suggestionBaseContract,
    type: z.literal("handoff_summary"),
    payload: z.object({
      summary: z.string(),
      keyPoints: z.array(z.string()),
      suggestedNextStep: z.string(),
      sources: z.array(aiReplySourceContract).optional(),
    }),
  }),
  z.object({
    ...suggestionBaseContract,
    type: z.literal("root_cause_cluster"),
    payload: z.object({
      relatedTicketIds: z.array(z.number()),
      rootCause: z.string(),
      summary: z.string(),
    }),
  }),
]);

export const supportAiSuggestionListContract = z.array(supportAiSuggestionRowContract);

export const supportAiSuggestionNullableContract = supportAiSuggestionRowContract.nullable();

export const supportAiAnalyzeResultContract = supportAiSuggestionListContract.nullable();

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
