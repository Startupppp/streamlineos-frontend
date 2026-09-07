import { z } from "zod";

const automationGraphNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  config: z.record(z.string(), z.unknown()).optional(),
  nextId: z.string().optional(),
  branches: z.array(z.object({
    condition: z.record(z.string(), z.unknown()),
    nextId: z.string(),
  })).optional(),
});

const automationRuleSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  trigger: z.string(),
  isActive: z.boolean(),
  executionCount: z.number().int(),
  lastRunAt: z.string().nullable(),
  version: z.number().int(),
  isDraft: z.boolean(),
  graph: z.array(automationGraphNodeSchema).nullable(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.string(),
  })),
  actions: z.array(z.string()),
  cooldownMinutes: z.number().int(),
  createdAt: z.string().nullable(),
});

export const automationRulesListContract = z.object({
  rules: z.array(automationRuleSchema),
});

export const automationRuleContract = automationRuleSchema;

export const deleteAutomationRuleContract = z.object({
  success: z.boolean(),
});

export const testRuleResultContract = z.object({
  matched: z.boolean(),
  nodes: z.array(z.object({
    nodeId: z.string(),
    type: z.string(),
    result: z.string(),
  })),
});

const automationEventSchema = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
  entityType: z.string(),
  isActive: z.boolean(),
});

export const automationEventsListContract = z.object({
  events: z.array(automationEventSchema),
});

const automationActionSchema = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
  configSchema: z.record(z.string(), z.unknown()).nullable(),
  isActive: z.boolean(),
});

export const automationActionsListContract = z.object({
  actions: z.array(automationActionSchema),
});

const automationRunStepSchema = z.object({
  nodeId: z.string(),
  type: z.string(),
  status: z.string(),
  message: z.string().optional(),
  branchTaken: z.string().optional(),
  at: z.string(),
});

const automationRunSchema = z.object({
  id: z.string(),
  eventKey: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  status: z.enum(["queued", "running", "success", "failed", "skipped"]),
  steps: z.array(automationRunStepSchema).nullable(),
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
