export type AutomationTriggerEvent =
  | "ticket.created"
  | "ticket.updated"
  | "ticket.status_changed"
  | "ticket.assigned"
  | "sprint.started"
  | "sprint.completed";

export type AutomationActionType =
  | "set_status"
  | "set_assignee"
  | "set_priority"
  | "add_label"
  | "add_comment";

export interface AutomationCondition {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "is_empty" | "is_not_empty";
  value?: string;
}

export interface AutomationAction {
  type: AutomationActionType;
  value: string;
}

export interface AutomationCreatedByUser {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

export interface ProjectAutomation {
  id: number;
  projectId: number;
  name: string;
  isActive: boolean;
  triggerEvent: AutomationTriggerEvent;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  createdBy: string | null;
  createdByUser: AutomationCreatedByUser | null;
  lastRunAt: string | null;
  lastFailureAt: string | null;
  createdAt: string;
  updatedAt: string;
}
