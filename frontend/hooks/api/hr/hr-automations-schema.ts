import { z } from "zod";
import type {
  HrAutomationEvent,
  HrAutomationCondition,
  HrAutomationAction,
  HrAutomationRunStatus,
  EventFieldDoc,
} from "@/types/hr/automations";

const automationEventContract = z.custom<HrAutomationEvent>((v) => typeof v === "string");
const automationConditionContract = z.custom<HrAutomationCondition>((v) => typeof v === "object" && v !== null);
const automationActionContract = z.custom<HrAutomationAction>((v) => typeof v === "object" && v !== null);
const automationRunStatusContract = z.custom<HrAutomationRunStatus>((v) => typeof v === "string");

const automationRuleContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  triggerEvent: automationEventContract,
  conditions: z.array(automationConditionContract),
  actions: z.array(automationActionContract),
  isEnabled: z.boolean(),
  webhookSecret: z.string().nullable(),
  runCount: z.number().int(),
  lastRunAt: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
});

export const automationRuleListContract = z.object({
  items: z.array(automationRuleContract),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export const automationRuleDetailContract = automationRuleContract;

const automationRunActionResultContract = z.object({
  type: z.string(),
  ok: z.boolean(),
  error: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

const automationRunContract = z.object({
  id: z.number().int(),
  orgId: z.string(),
  ruleId: z.number().int(),
  triggerEvent: z.string(),
  eventPayload: z.record(z.string(), z.unknown()).nullable(),
  status: automationRunStatusContract,
  actionResults: z.array(automationRunActionResultContract).nullable(),
  error: z.string().nullable(),
  durationMs: z.number().int().nullable(),
  triggeredByRunId: z.number().int().nullable(),
  depth: z.number().int(),
  createdAt: z.string(),
});

export const automationRunListContract = z.object({
  data: z.array(automationRunContract),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export const automationTestResultContract = z.object({
  matched: z.boolean(),
  status: automationRunStatusContract,
  matchedConditions: z.array(
    z.object({ condition: automationConditionContract, matched: z.boolean() }),
  ),
  wouldRunActions: z.array(automationActionContract),
});

const eventFieldDocContract = z.custom<EventFieldDoc>((v) => typeof v === "object" && v !== null);

const automationEventItemContract = z.object({
  value: automationEventContract,
  fields: z.array(eventFieldDocContract),
  samplePayload: z.record(z.string(), z.unknown()),
});

export const automationEventsListContract = z.object({
  events: z.array(automationEventItemContract),
});

export const successResponseContract = z.object({ success: z.boolean() });
