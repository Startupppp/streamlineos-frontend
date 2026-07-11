export type HrAutomationEvent =
  | "employee.created"
  | "employee.onboarded"
  | "employee.probation_due"
  | "employee.confirmed"
  | "employee.transferred"
  | "employee.promoted"
  | "employee.salary_revised"
  | "leave.requested"
  | "leave.approved"
  | "attendance.late"
  | "attendance.missed_punch"
  | "document.expiring"
  | "asset.assigned"
  | "asset.return_due"
  | "review.cycle_started"
  | "review.due"
  | "goal.overdue"
  | "course.assigned"
  | "resignation.submitted"
  | "exit.completed"
  | "employee.updated"
  | "employee.exited"
  | "contract.ended"
  | "attendance.finalized"
  | "payroll.inputs_locked";

export type HrConditionOperator = "eq" | "neq" | "in" | "gte" | "lte" | "contains";

export interface HrAutomationCondition {
  field: string;
  operator: HrConditionOperator;
  value: string | number | boolean | string[];
}

export type HrAutomationActionType =
  | "create_task"
  | "start_workflow"
  | "send_notification"
  | "send_email"
  | "assign_document"
  | "generate_letter"
  | "assign_course"
  | "assign_asset"
  | "create_hr_case"
  | "update_field"
  | "call_webhook";

export type HrAutomationAction =
  | { type: "create_task"; config: { title: string; assigneeId?: string; dueInDays?: number } }
  | { type: "start_workflow"; config: { workflowId: string } }
  | { type: "send_notification"; config: { title: string; message: string; link?: string; roles?: string[] } }
  | { type: "send_email"; config: { to: string; subject: string; body: string } }
  | { type: "assign_document"; config: { documentTypeId: number } }
  | { type: "generate_letter"; config: { templateId: number } }
  | { type: "assign_course"; config: { courseId: number } }
  | { type: "assign_asset"; config: { assetTypeId: number } }
  | { type: "create_hr_case"; config: { subject: string; categoryId?: number } }
  | { type: "update_field"; config: { field: string; value: string | number | boolean } }
  | { type: "call_webhook"; config: { url: string; method?: "POST" | "PUT" } };

export type HrAutomationRunStatus = "success" | "partial" | "failed" | "skipped";

export interface HrAutomationRule {
  id: number;
  orgId: string;
  name: string;
  description: string | null;
  triggerEvent: HrAutomationEvent;
  conditions: HrAutomationCondition[];
  actions: HrAutomationAction[];
  isEnabled: boolean;
  runCount: number;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HrAutomationRun {
  id: number;
  ruleId: number;
  triggerEvent: string;
  eventPayload: Record<string, unknown> | null;
  status: HrAutomationRunStatus;
  actionResults: Array<{ type: string; ok: boolean; error?: string; data?: Record<string, unknown> }> | null;
  error: string | null;
  durationMs: number | null;
  triggeredByRunId: number | null;
  depth: number;
  createdAt: string;
}

export interface EventFieldDoc {
  field: string;
  label: string;
  type: "string" | "number" | "boolean" | "date";
}

export interface HrEventDefinition {
  value: HrAutomationEvent;
  fields: EventFieldDoc[];
  samplePayload: Record<string, unknown>;
}

export interface HrTestResult {
  matched: boolean;
  status: HrAutomationRunStatus;
  matchedConditions: Array<{ condition: HrAutomationCondition; matched: boolean }>;
  wouldRunActions: HrAutomationAction[];
}

export interface CreateHrAutomationInput {
  name: string;
  description?: string;
  triggerEvent: HrAutomationEvent;
  conditions: HrAutomationCondition[];
  actions: HrAutomationAction[];
  isEnabled: boolean;
}

export interface UpdateHrAutomationInput {
  name?: string;
  description?: string | null;
  triggerEvent?: HrAutomationEvent;
  conditions?: HrAutomationCondition[];
  actions?: HrAutomationAction[];
  isEnabled?: boolean;
}
