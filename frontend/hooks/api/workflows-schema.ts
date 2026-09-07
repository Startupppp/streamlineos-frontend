import { z } from "zod";

const wireDate = () => z.string();
const nullableWireDate = () => z.string().nullable();

const cursorPaginationSchema = z.object({
  limit: z.number().int(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

const workflowRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(["draft", "published", "disabled", "archived"]),
  version: z.number().int(),
  createdBy: z.string().nullable(),
  createdAt: wireDate(),
  updatedAt: wireDate(),
});

export const workflowListContract = z.object({
  data: z.array(workflowRowSchema),
  pagination: cursorPaginationSchema,
});

const workflowVersionRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string(),
  workflowId: z.string().uuid(),
  version: z.number().int(),
  definitionJson: z.record(z.string(), z.unknown()),
  publishedBy: z.string().nullable(),
  publishedAt: nullableWireDate(),
  createdAt: wireDate(),
});

export const workflowDetailContract = z.object({
  id: z.string().uuid(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(["draft", "published", "disabled", "archived"]),
  version: z.number().int(),
  createdBy: z.string().nullable(),
  createdAt: wireDate(),
  updatedAt: wireDate(),
  createdByName: z.string().nullable(),
  createdByEmail: z.string().nullable(),
  versions: z.array(workflowVersionRowSchema),
});

export const workflowCreateContract = workflowRowSchema;

export const workflowUpdateContract = workflowRowSchema;

export const workflowDeleteContract = z.object({ success: z.literal(true) });

export const workflowPublishContract = z.object({
  workflow: workflowRowSchema,
  version: workflowVersionRowSchema,
});

const workflowExecutionRowSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
  workflowVersionId: z.string().uuid(),
  orgId: z.string(),
  status: z.enum(["pending", "running", "waiting", "completed", "failed", "cancelled", "timed_out", "dead_lettered"]),
  triggerType: z.enum(["event", "schedule", "webhook", "api", "manual"]).nullable(),
  triggerData: z.record(z.string(), z.unknown()).nullable(),
  context: z.record(z.string(), z.unknown()).nullable(),
  startedAt: nullableWireDate(),
  completedAt: nullableWireDate(),
  durationMs: z.number().int().nullable(),
  triggeredBy: z.string().nullable(),
  dlqReason: z.string().nullable(),
  createdAt: wireDate(),
});

export const workflowExecutionListContract = z.object({
  data: z.array(workflowExecutionRowSchema),
  pagination: cursorPaginationSchema,
});

export const workflowExecutionTriggerContract = workflowExecutionRowSchema;

export const workflowExecutionCancelContract = workflowExecutionRowSchema;

export const workflowPendingApprovalsContract = z.array(
  z.object({
    id: z.string().uuid(),
    executionId: z.string().uuid(),
    stepId: z.string().uuid(),
    approverId: z.string(),
    status: z.string(),
    comment: z.string().nullable(),
    approvedAt: z.string().nullable(),
    rejectedAt: z.string().nullable(),
    expiresAt: z.string().nullable(),
    createdAt: z.string(),
    workflow: z.object({ id: z.string().uuid(), name: z.string() }),
  }),
);

export const workflowApprovalActionContract = z.object({
  id: z.string().uuid(),
  executionId: z.string().uuid(),
  stepId: z.string().uuid(),
  approverId: z.string(),
  status: z.string(),
  comment: z.string().nullable(),
  approvedAt: z.string().nullable(),
  rejectedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  workflow: z.object({ id: z.string().uuid(), name: z.string() }).optional(),
});

const workflowScheduleRowSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
  orgId: z.string(),
  cronExpression: z.string(),
  timezone: z.string(),
  isEnabled: z.boolean(),
  nextRunAt: nullableWireDate(),
  lastRunAt: nullableWireDate(),
  createdAt: wireDate(),
  updatedAt: wireDate(),
});

export const workflowScheduleListContract = z.object({
  data: z.array(workflowScheduleRowSchema),
  pagination: cursorPaginationSchema,
});

export const workflowScheduleUpdateContract = workflowScheduleRowSchema;

export const workflowScheduleDeleteContract = z.object({ success: z.literal(true) });

const workflowSecretRowSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: wireDate(),
  updatedAt: wireDate(),
});

export const workflowSecretListContract = z.object({
  data: z.array(workflowSecretRowSchema),
  pagination: cursorPaginationSchema,
});

export const workflowSecretCreateContract = workflowSecretRowSchema;

export const workflowSecretDeleteContract = z.object({ success: z.literal(true) });

const workflowVariableSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  valueType: z.string(),
  defaultValue: z.unknown().nullable(),
  workflowVersionId: z.string().uuid(),
  createdAt: wireDate(),
  workflowId: z.string().uuid(),
  workflowName: z.string(),
});

export const workflowVariableListContract = z.array(workflowVariableSchema);

export const workflowVariableDeleteContract = z.object({ success: z.literal(true) });

export const workflowAnalyticsContract = z.object({
  totalWorkflows: z.number().int(),
  activeWorkflows: z.number().int(),
  totalExecutions: z.number().int(),
  successRate: z.number().int(),
  avgDuration: z.number().int(),
  pendingApprovals: z.number().int(),
  executionTrend: z.array(
    z.object({
      date: z.string(),
      count: z.number().int(),
      successCount: z.number().int(),
    }),
  ),
});

const workflowTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string().optional(),
  definitionJson: z.record(z.string(), z.unknown()).optional(),
});

export const workflowTemplateListContract = z.array(workflowTemplateSchema);
