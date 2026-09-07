"use client";

export type WorkflowStatus = "draft" | "published" | "disabled" | "archived";
export type ExecutionStatus =
  | "pending"
  | "running"
  | "waiting"
  | "completed"
  | "failed"
  | "cancelled"
  | "timed_out"
  | "dead_lettered";
export type TriggerType = "event" | "schedule" | "webhook" | "api" | "manual";
export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "delegated"
  | "expired";
export type NodeType =
  | "trigger"
  | "condition"
  | "approval"
  | "action"
  | "delay"
  | "loop"
  | "ai_action"
  | "integration"
  | "script"
  | "end";
export type WorkflowSortField = "updatedAt" | "createdAt";
export type SortDirection = "asc" | "desc";

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  version: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  definitionJson?: Record<string, unknown> | null;
  createdByName?: string | null;
  createdByEmail?: string | null;
}

export interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: number;
  definitionJson: Record<string, unknown>;
  publishedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowVersionId: string;
  status: ExecutionStatus;
  triggerType: TriggerType | null;
  triggerData: Record<string, unknown> | null;
  context: Record<string, unknown> | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  triggeredBy: string | null;
  createdAt: string;
}

export interface WorkflowApproval {
  id: string;
  executionId: string;
  stepId: string;
  approverId: string;
  status: ApprovalStatus;
  comment: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  workflow?: { id: string; name: string };
}

export interface WorkflowSchedule {
  id: string;
  workflowId: string;
  cronExpression: string;
  timezone: string;
  isEnabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowSecret {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  definitionJson: Record<string, unknown>;
  createdAt: string;
}

export interface WorkflowPublishResult {
  workflow: Workflow;
  version: WorkflowVersion;
}

export interface WorkflowVariable {
  id: string;
  key: string;
  valueType: string;
  defaultValue: unknown | null;
  workflowVersionId: string;
  createdAt: string;
  workflowId: string;
  workflowName: string;
}

export interface WorkflowAnalytics {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successRate: number;
  avgDuration: number;
  pendingApprovals: number;
  executionTrend: Array<{ date: string; count: number; successCount: number }>;
}

export interface WorkflowCursorPage<T> {
  data: T[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export interface WorkflowListParams {
  cursor?: string;
  limit?: number;
  sort?: WorkflowSortField;
  direction?: SortDirection;
  status?: WorkflowStatus;
  search?: string;
}

export interface ExecutionListParams {
  cursor?: string;
  limit?: number;
  direction?: SortDirection;
  status?: ExecutionStatus;
}
