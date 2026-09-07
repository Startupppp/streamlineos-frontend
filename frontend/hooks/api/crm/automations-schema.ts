import { z } from "zod";

const automationRuleSchema = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  trigger: z.string(),
  conditions: z.unknown(),
  actions: z.unknown(),
  isActive: z.boolean(),
  executionCount: z.number().int(),
  lastRunAt: z.string().nullable(),
  graph: z.unknown().nullable(),
  version: z.number().int(),
  isDraft: z.boolean(),
  lastError: z.string().nullable(),
  cooldownMinutes: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const automationRulesListContract = z.object({
  rules: z.array(automationRuleSchema),
});

export const automationRuleContract = automationRuleSchema;

const automationEventSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  key: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  entityType: z.string(),
  isActive: z.boolean(),
  isSystemDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const automationEventsListContract = z.object({
  events: z.array(automationEventSchema),
});

const automationActionSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  key: z.string(),
  label: z.string(),
  description: z.string().nullable(),
  configSchema: z.unknown().nullable(),
  isActive: z.boolean(),
  isSystemDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const automationActionsListContract = z.object({
  actions: z.array(automationActionSchema),
});

const automationRunSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  ruleId: z.number().int(),
  eventKey: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  status: z.string(),
  steps: z.unknown().nullable(),
  error: z.string().nullable(),
  triggeredBy: z.string(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
});

export const automationRunsPageContract = z.object({
  runs: z.array(automationRunSchema),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
  total: z.number().int().optional(),
});

export const automationDryRunContract = z.object({
  matched: z.boolean(),
  nodes: z.array(
    z.object({
      nodeId: z.string(),
      type: z.string(),
      result: z.string(),
    }),
  ),
});

export const automationDeleteContract = z.object({ success: z.boolean() });
