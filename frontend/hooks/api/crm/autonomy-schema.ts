import { z } from "zod";

const decisionKindSchema = z.enum([
  "task.extracted",
  "stage.advanced",
  "party.created",
  "activity.logged",
  "quote.sent",
]);

const autonomousDecisionSchema = z.object({
  autonomousDecisionId: z.string(),
  kind: decisionKindSchema,
  outcome: z.enum(["applied", "held", "skipped", "reversed", "failed"]),
  summary: z.string().nullable(),
  confidence: z.number().nullable(),
  reversibility: z.enum(["instant", "hold", "irreversible"]),
  triggerType: z.string(),
  triggerId: z.string().nullable(),
  partyId: z.string().nullable(),
  dealId: z.string().nullable(),
  activityId: z.string().nullable(),
  decidedAt: z.string(),
  reversedAt: z.string().nullable(),
  reversedByUserId: z.string().nullable(),
  reversedReason: z.string().nullable(),
  model: z.string().nullable(),
  promptVersion: z.string().nullable(),
  dealName: z.string().nullable(),
  partyName: z.string().nullable(),
});

export const decisionsPageContract = z.object({
  data: z.array(autonomousDecisionSchema),
  pagination: z.object({
    limit: z.number().int(),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
});

export const reverseDecisionContract = z.object({
  reversed: z.boolean(),
  action: z.string(),
});

const autonomySwitchSchema = z.object({
  organizationId: z.string().nullable(),
  kind: z.string(),
  enabled: z.boolean(),
  reason: z.string().nullable(),
  updatedAt: z.string(),
});

const effectiveSwitchSchema = z.object({
  kind: decisionKindSchema,
  allowed: z.boolean(),
  decidedBy: z.enum(["platform-all", "platform-kind", "org-all", "org-kind", "default"]),
  reason: z.string().nullable(),
});

export const switchesContract = z.object({
  switches: z.array(autonomySwitchSchema),
  effective: z.array(effectiveSwitchSchema),
});

const scoreboardKindRowSchema = z.object({
  kind: decisionKindSchema,
  actions: z.number().int(),
  corrections: z.number().int(),
  correctionRate: z.number().nullable(),
  shadowScored: z.number().int(),
  shadowDisagreed: z.number().int(),
  shadowDisagreementRate: z.number().nullable(),
});

const datasetHealthPointSchema = z.object({
  capturedOn: z.string(),
  composite: z.number(),
  openTotal: z.number().int(),
});

const datasetHealthSchema = z.object({
  composite: z.number(),
  openTotal: z.number().int(),
  bySeverity: z.object({ high: z.number().int(), medium: z.number().int(), low: z.number().int() }),
  byClass: z.array(z.object({
    producer: z.enum(["duplicate", "contradiction", "reachability", "staleness", "import-uncertainty"]),
    count: z.number().int(),
    weight: z.number(),
  })),
});

export const scoreboardContract = z.object({
  since: z.string(),
  days: z.number().int(),
  perKind: z.array(scoreboardKindRowSchema),
  dataset: z.object({
    windowDays: z.number().int(),
    current: datasetHealthSchema,
    series: z.array(datasetHealthPointSchema),
    baseline: datasetHealthPointSchema.nullable(),
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
    kind: decisionKindSchema,
    verdict: z.enum(["agrees", "disagrees", "uncertain", "failed"]),
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

export const cancelHoldContract = z.object({ cancelled: z.boolean() });

export const autonomySettingsContract = z.object({
  shadowSampleRate: z.number(),
  shadowDailyCap: z.number().int(),
  holdWindowSeconds: z.number().int(),
});
