import { z } from "zod";

const autonomousDecisionSchema = z.object({
  autonomousDecisionId: z.string(),
  organizationId: z.string(),
  kind: z.string(),
  outcome: z.string(),
  triggerType: z.string(),
  triggerId: z.string().nullable(),
  partyId: z.string().nullable(),
  dealId: z.string().nullable(),
  activityId: z.string().nullable(),
  model: z.string().nullable(),
  promptVersion: z.string().nullable(),
  confidence: z.number().nullable(),
  inputs: z.record(z.string(), z.unknown()).nullable(),
  decision: z.record(z.string(), z.unknown()).nullable(),
  summary: z.string().nullable(),
  reversibility: z.string(),
  reversedAt: z.string().nullable(),
  reversedByUserId: z.string().nullable(),
  reversedReason: z.string().nullable(),
  decidedAt: z.string(),
});

export const decisionsPageContract = z.object({
  items: z.array(autonomousDecisionSchema),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
  total: z.number().int().optional(),
});

export const reverseDecisionContract = z.object({
  reversed: z.literal(true),
  action: z.string(),
});

export const switchesContract = z.object({
  switches: z.array(
    z.object({
      organizationId: z.string().nullable(),
      kind: z.string(),
      enabled: z.boolean(),
      reason: z.string().nullable(),
      updatedAt: z.string().nullable(),
    }),
  ),
  effective: z.array(
    z.object({
      kind: z.string(),
      enabled: z.boolean(),
      reason: z.string().nullable(),
    }),
  ),
});

export const scoreboardContract = z.object({
  since: z.string(),
  days: z.number().int(),
  perKind: z.array(
    z.object({
      kind: z.string(),
      actions: z.number().int(),
      corrections: z.number().int(),
      correctionRate: z.number().nullable(),
      shadowScored: z.number().int(),
      shadowDisagreed: z.number().int(),
      shadowDisagreementRate: z.number().nullable(),
    }),
  ),
  dataset: z.object({
    windowDays: z.number().int(),
    current: z.object({
      composite: z.number(),
      openTotal: z.number().int(),
      bySeverity: z.object({ high: z.number().int(), medium: z.number().int(), low: z.number().int() }),
      byClass: z.array(
        z.object({
          producer: z.string(),
          count: z.number().int(),
          weight: z.number(),
        }),
      ),
    }),
    series: z.array(
      z.object({
        capturedOn: z.string(),
        composite: z.number(),
        openTotal: z.number().int(),
      }),
    ),
    baseline: z
      .object({
        capturedOn: z.string(),
        composite: z.number(),
        openTotal: z.number().int(),
      })
      .nullable(),
    delta: z.number().nullable(),
    direction: z.enum(["improving", "worsening", "unchanged"]).nullable(),
  }),
  spend: z.object({
    calls: z.number().int(),
    totalTokens: z.number().int(),
    estimatedCostUsd: z.string(),
  }),
});

export const reviewQueueContract = z.array(
  z.object({
    autonomyShadowScoreId: z.string(),
    autonomousDecisionId: z.string(),
    kind: z.string(),
    verdict: z.string(),
    score: z.number().nullable(),
    rationale: z.string().nullable(),
    createdAt: z.string(),
    decisionSummary: z.string().nullable(),
    decidedAt: z.string(),
    confidence: z.number().nullable(),
  }),
);

export const markReviewedContract = z.object({ reviewed: z.boolean() });

export const liveHoldsContract = z.array(
  z.object({
    autonomyHoldId: z.string(),
    autonomousDecisionId: z.string(),
    quoteId: z.number().int().nullable(),
    holdUntil: z.string(),
    createdAt: z.string(),
    quoteSubject: z.string().nullable(),
    summary: z.string().nullable(),
    secondsRemaining: z.number(),
  }),
);

export const cancelHoldContract = z.object({ cancelled: z.literal(true) });

export const autonomySettingsContract = z.object({
  shadowSampleRate: z.number(),
  shadowDailyCap: z.number().int(),
  holdWindowSeconds: z.number().int(),
});
