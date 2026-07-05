export interface AutomationCondition {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "is_empty" | "is_not_empty";
  value?: string;
}

export interface AutomationAction {
  type: "set_status" | "set_assignee" | "set_priority" | "add_label" | "add_comment";
  value: string;
}

export interface ProjectAutomation {
  id: number;
  projectId: number;
  name: string;
  isActive: boolean;
  triggerEvent: string;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  createdAt: string;
}
