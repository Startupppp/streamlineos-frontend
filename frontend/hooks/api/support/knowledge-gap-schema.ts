import { z } from "zod";

const supportKnowledgeGapRowContract = z.object({
  id: z.number(),
  orgId: z.string(),
  representativeQuestion: z.string(),
  ticketCount: z.number(),
  sampleTicketIds: z.array(z.number()),
  status: z.string(),
  proposedArticleId: z.number().nullable(),
  draftedBy: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  evidence: z.unknown().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const supportKnowledgeGapWithDeflectionContract = supportKnowledgeGapRowContract.and(
  z.object({
    deflectionCount: z.number(),
    proposedArticleTitle: z.string().nullable(),
  }),
);

export const gapListResponseContract = z.object({
  gaps: z.array(supportKnowledgeGapWithDeflectionContract),
  nextCursor: z.number().nullable(),
});

export const detectGapsJobContract = z.object({ jobId: z.number() });

export const proposeDraftResponseContract = z.object({
  gap: supportKnowledgeGapRowContract.and(
    z.object({
      aiUsage: z.object({
        model: z.string(),
        promptTokens: z.number(),
        completionTokens: z.number(),
        totalTokens: z.number(),
        credits: z.number(),
        costUsd: z.number(),
      }).optional(),
    }),
  ),
});

export const dismissGapResponseContract = supportKnowledgeGapRowContract;
