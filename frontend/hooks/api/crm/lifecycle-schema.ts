import { z } from "zod";

/**
 * Wire contracts for the renewal-book writes and the trigger sweep, field for
 * field with `lifecycle/dto/lifecycle-response.schemas.ts` and
 * `lifecycle/dto/triggers-response.schemas.ts`.
 */

const bandSchema = z.enum(["at-risk", "watch", "healthy"]);
const statusSchema = z.enum(["active", "churned", "cancelled"]);

const lifecycleRowSchema = z.object({
  customerLifecycleId: z.string(),
  organizationId: z.string(),
  partyId: z.string(),
  sourceDealId: z.number().int(),
  status: statusSchema,
  startedOn: z.string(),
  termMonths: z.number().int(),
  renewalOn: z.string(),
  contractValueMinor: z.number().int(),
  renewalCount: z.number().int(),
  riskScore: z.number().int(),
  riskComputedAt: z.string().nullable(),
  lastSignalAt: z.string().nullable(),
  closedReason: z.string().nullable(),
  closedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const lifecycleSignalSchema = z.object({
  lifecycleSignalId: z.string(),
  kind: z.string(),
  impact: z.number().int(),
  observedAt: z.string(),
  source: z.string(),
  recordedByUserId: z.string().nullable(),
  note: z.string().nullable(),
});

export const lifecycleDetailContract = z.object({
  data: lifecycleRowSchema.extend({
    band: bandSchema,
    signals: z.array(lifecycleSignalSchema),
  }),
});

export const recordLifecycleSignalContract = z.object({
  data: z.object({
    signal: lifecycleSignalSchema.extend({
      organizationId: z.string(),
      customerLifecycleId: z.string(),
      createdAt: z.string(),
    }),
    riskScore: z.number().int(),
    band: bandSchema,
  }),
});

export const renewLifecycleContract = z.object({
  data: lifecycleRowSchema.extend({ band: bandSchema }),
});

export const closeLifecycleContract = z.object({ data: lifecycleRowSchema });

const sweepEntrySchema = z.object({
  customerLifecycleId: z.string(),
  partyId: z.string(),
  renewalOn: z.string(),
  action: z.enum(["opened", "reoffered", "stood-down"]),
  outcome: z.enum(["held", "skipped"]).nullable(),
  reason: z.string().nullable(),
  triggerId: z.string().nullable(),
  opportunityDealId: z.number().int().nullable(),
  autonomyHoldId: z.string().nullable(),
});

export const sweepLifecycleTriggersContract = z.object({
  asOf: z.string(),
  considered: z.number().int(),
  opened: z.number().int(),
  reoffered: z.number().int(),
  held: z.number().int(),
  entries: z.array(sweepEntrySchema),
});

export const considerLifecycleTriggerContract = sweepEntrySchema;

const lifecycleTriggerSchema = z.object({
  customerLifecycleTriggerId: z.string(),
  customerLifecycleId: z.string(),
  partyId: z.string(),
  partyName: z.string().nullable(),
  kind: z.string(),
  termStartedOn: z.string(),
  renewalOn: z.string(),
  dueOn: z.string(),
  riskScore: z.number().int(),
  healthScore: z.number().int().nullable(),
  opportunityDealId: z.number().int().nullable(),
  attempts: z.number().int(),
  lastAttemptAt: z.string().nullable(),
  outcome: z.string().nullable(),
  refusalStage: z.string().nullable(),
  refusalReason: z.string().nullable(),
  autonomyHoldId: z.string().nullable(),
  autonomousDecisionId: z.string().nullable(),
  outboundMessageId: z.string().nullable(),
  firedAt: z.string(),
});

/** `GET /crm/lifecycle-triggers` — the trigger log, newest first. */
export const listLifecycleTriggersContract = z.object({
  triggers: z.array(lifecycleTriggerSchema),
  limit: z.number().int(),
  offset: z.number().int(),
  hasMore: z.boolean(),
});

export type LifecycleDetail = z.infer<typeof lifecycleDetailContract>["data"];
export type LifecycleSignal = z.infer<typeof lifecycleSignalSchema>;
export type LifecycleSweepResult = z.infer<typeof sweepLifecycleTriggersContract>;
export type LifecycleSweepEntry = z.infer<typeof sweepEntrySchema>;
export type LifecycleTrigger = z.infer<typeof lifecycleTriggerSchema>;
export type LifecycleTriggerList = z.infer<typeof listLifecycleTriggersContract>;
