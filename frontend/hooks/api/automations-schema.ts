import { z } from "zod";
import { AUTOMATION_TRIGGERS } from "@/lib/automations/automation-triggers";

const wireDate = () => z.string();
const nullableWireDate = () => z.string().nullable();

export const automationRunStatusEnum = z.enum(["success", "failed", "skipped"]);

const automationActionTypeEnum = z.enum([
  "notify_roles", "notify_all", "email", "create_task", "webhook",
  "support_assign_ticket", "support_set_priority", "support_add_tag",
  "support_internal_note", "ai_classify", "ai_summarize", "ai_extract",
  "ai_routing_suggestion",
]);

export const automationConditionSchema = z.object({
  field: z.string(),
  op: z.enum(["eq", "neq", "contains", "gt", "lt", "exists"]),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

const aiActionConfigSchema = z.record(z.string(), z.unknown());

export const automationActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("notify_roles"), config: z.object({ roles: z.array(z.string()), title: z.string(), message: z.string(), link: z.string().optional() }) }),
  z.object({ type: z.literal("notify_all"), config: z.object({ title: z.string(), message: z.string(), link: z.string().optional() }) }),
  z.object({ type: z.literal("email"), config: z.object({ to: z.union([z.string(), z.array(z.string())]), subject: z.string(), body: z.string() }) }),
  z.object({ type: z.literal("create_task"), config: z.object({ title: z.string(), assigneeId: z.string().optional(), dueInDays: z.number().optional() }) }),
  z.object({ type: z.literal("webhook"), config: z.object({ event: z.string() }) }),
  z.object({ type: z.literal("support_assign_ticket"), config: z.object({ assigneeId: z.string() }) }),
  z.object({ type: z.literal("support_set_priority"), config: z.object({ priority: z.string() }) }),
  z.object({ type: z.literal("support_add_tag"), config: z.object({ tagId: z.number() }) }),
  z.object({ type: z.literal("support_internal_note"), config: z.object({ body: z.string() }) }),
  z.object({ type: z.literal("ai_classify"), config: aiActionConfigSchema }),
  z.object({ type: z.literal("ai_summarize"), config: aiActionConfigSchema }),
  z.object({ type: z.literal("ai_extract"), config: aiActionConfigSchema }),
  z.object({ type: z.literal("ai_routing_suggestion"), config: aiActionConfigSchema }),
]);

export const automationRuleListItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  description: z.string().nullable(),
  triggerEvent: z.enum(AUTOMATION_TRIGGERS),
  conditions: z.array(automationConditionSchema),
  actions: z.array(automationActionSchema),
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

export const automationRunItemSchema = z.object({
  id: z.number().int(),
  triggerEvent: z.string(),
  status: automationRunStatusEnum,
  payload: z.record(z.string(), z.unknown()).nullable(),
  result: z.record(z.string(), z.unknown()).nullable(),
  error: z.string().nullable(),
  createdAt: wireDate(),
});

export const automationRunsContract = z.array(automationRunItemSchema);

export const automationActionResultSchema = z.object({
  type: automationActionTypeEnum,
  ok: z.boolean(),
  error: z.string().optional(),
});

export const automationTestContract = z.object({
  runId: z.number().int(),
  matched: z.boolean(),
  status: automationRunStatusEnum,
  actionResults: z.array(automationActionResultSchema),
});
