export interface CrmAutomationEvent {
  id: string;
  key: string;
  label: string;
  entityType: string;
  isActive: boolean;
}

export interface CrmAutomationAction {
  id: string;
  key: string;
  label: string;
  configSchema: Record<string, unknown> | null;
  isActive: boolean;
}

export type AutomationRunStatus = "queued" | "running" | "success" | "failed" | "skipped";

export interface AutomationRun {
  id: string;
  eventKey: string;
  entityType: string;
  entityId: string;
  status: AutomationRunStatus;
  steps: Array<{nodeId: string; type: string; status: string; message?: string; branchTaken?: string; at: string}> | null;
  error: string | null;
  triggeredBy: string;
  startedAt: string;
  finishedAt: string | null;
}

export interface AutomationGraphNode {
  id: string;
  type: string;
  config?: Record<string, unknown>;
  nextId?: string;
  branches?: { condition: Record<string, unknown>; nextId: string }[];
}

export interface CrmAutomationRule {
  id: number;
  name: string;
  trigger: string;
  isActive: boolean;
  executionCount: number;
  lastRunAt: string | null;
  version: number;
  isDraft: boolean;
  graph: AutomationGraphNode[] | null;
  conditions: Array<{field: string; operator: string; value: string}>;
  actions: string[];
  cooldownMinutes: number;
  createdAt: string | null;
}

export type SequenceStepType = "email" | "call_task" | "whatsapp_task" | "wait";
export type SequenceEnrollmentStatus = "active" | "completed" | "stopped" | "failed";

export interface CrmSequenceStep {
  id: string;
  sequenceId: string;
  sortOrder: number;
  stepType: SequenceStepType;
  config: Record<string, unknown> | null;
  waitHours: number | null;
}

export interface CrmSequence {
  id: string;
  name: string;
  description: string | null;
  entityType: string;
  isActive: boolean;
  stopOn: Record<string, unknown> | null;
  createdAt: string;
}

export interface CrmSequenceEnrollment {
  id: string;
  entityType: string;
  entityId: string;
  status: SequenceEnrollmentStatus;
  currentStep: number;
  nextRunAt: string | null;
  stopReason: string | null;
}
