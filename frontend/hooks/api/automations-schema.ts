import { z } from "zod";

const wireDate = () => z.string();
const nullableWireDate = () => z.string().nullable();

const automationRuleListItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  description: z.string().nullable(),
  triggerEvent: z.string(),
  conditions: z.unknown(),
  actions: z.unknown(),
  isEnabled: z.boolean(),
  runCount: z.number().int(),
  lastRunAt: nullableWireDate(),
  createdAt: wireDate(),
  updatedAt: wireDate(),
});

const automationRuleSchema = automationRuleListItemSchema.extend({
  orgId: z.string(),
  createdBy: z.string().nullable(),
});

export const automationListContract = z.object({
  data: z.array(automationRuleListItemSchema),
  pagination: z.object({
    limit: z.number().int(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const automationContract = automationRuleSchema;

export const automationDeleteContract = z.object({ success: z.literal(true) });

const automationRunItemSchema = z.object({
  id: z.number().int(),
  triggerEvent: z.string(),
  status: z.string(),
  payload: z.unknown().nullable(),
  result: z.unknown().nullable(),
  error: z.string().nullable(),
  createdAt: wireDate(),
});

export const automationRunsContract = z.array(automationRunItemSchema);

const automationActionResultSchema = z.object({
  type: z.string(),
  ok: z.boolean(),
  error: z.string().optional(),
});

export const automationTestContract = z.object({
  runId: z.number().int(),
  matched: z.boolean(),
  status: z.string(),
  actionResults: z.array(automationActionResultSchema),
});
