export const HR_WORKFLOW_OBJECT_TYPES = [
  "leave_request",
  "attendance_regularization",
  "overtime_request",
  "comp_off_request",
  "expense_reimbursement",
  "travel_request",
  "employee_data_change",
  "document_review",
  "asset_request",
  "onboarding",
  "offboarding",
  "probation_confirmation",
  "promotion",
  "transfer",
  "salary_revision",
  "resignation",
  "termination",
  "grievance_case",
] as const;

export type HrWorkflowObjectType = typeof HR_WORKFLOW_OBJECT_TYPES[number];

export const HR_WORKFLOW_OBJECT_TYPE_LABELS: Record<HrWorkflowObjectType, string> = {
  leave_request: "Leave Request",
  attendance_regularization: "Attendance Regularization",
  overtime_request: "Overtime Request",
  comp_off_request: "Comp-Off Request",
  expense_reimbursement: "Expense Reimbursement",
  travel_request: "Travel Request",
  employee_data_change: "Employee Data Change",
  document_review: "Document Review",
  asset_request: "Asset Request",
  onboarding: "Onboarding",
  offboarding: "Offboarding",
  probation_confirmation: "Probation Confirmation",
  promotion: "Promotion",
  transfer: "Transfer",
  salary_revision: "Salary Revision",
  resignation: "Resignation",
  termination: "Termination",
  grievance_case: "Grievance Case",
};

export const HR_WORKFLOW_APPROVER_TYPES = [
  "direct_manager",
  "managers_manager",
  "hr_role",
  "finance_role",
  "department_head",
  "location_hr",
  "named_user",
  "dynamic_expression",
] as const;

export type HrWorkflowApproverType = typeof HR_WORKFLOW_APPROVER_TYPES[number];

export const HR_WORKFLOW_APPROVER_TYPE_LABELS: Record<HrWorkflowApproverType, string> = {
  direct_manager: "Direct Manager",
  managers_manager: "Manager's Manager",
  hr_role: "HR Role",
  finance_role: "Finance Role",
  department_head: "Department Head",
  location_hr: "Location HR",
  named_user: "Named User",
  dynamic_expression: "Dynamic Expression",
};

export type HrWorkflowStepMode = "serial" | "parallel_all" | "parallel_any";
export type HrWorkflowStatus = "draft" | "active" | "archived";
export type HrWorkflowInstanceStatus = "pending" | "in_progress" | "approved" | "rejected" | "cancelled" | "reopened";
export type HrWorkflowAction = "approved" | "rejected" | "reassigned" | "escalated" | "commented" | "cancelled" | "reopened";

export interface HrWorkflowStep {
  id: number;
  definitionId: number;
  stepOrder: number;
  name: string;
  approverType: HrWorkflowApproverType;
  approverValue: string | null;
  mode: HrWorkflowStepMode;
  slaHours: number | null;
  escalationApproverType: HrWorkflowApproverType | null;
  escalationApproverValue: string | null;
  condition: { field: string; operator: string; value: unknown } | null;
}

export interface HrWorkflowDefinition {
  id: number;
  orgId: string;
  objectType: HrWorkflowObjectType;
  name: string;
  status: HrWorkflowStatus;
  version: number;
  isDefault: boolean;
  settings: {
    rejectionCommentRequired?: boolean;
    allowDelegation?: boolean;
    allowReopen?: boolean;
  };
  stepCount?: number;
  steps?: HrWorkflowStep[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface HrWorkflowUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface HrWorkflowStepAction {
  id: number;
  orgId: string;
  instanceId: number;
  stepOrder: number;
  approverUserId: string;
  actedByUserId: string;
  action: HrWorkflowAction;
  comment: string | null;
  attachments: { url: string; name: string }[] | null;
  actedAt: string;
  approver?: HrWorkflowUser;
  actedBy?: HrWorkflowUser;
}

export interface HrWorkflowInstance {
  id: number;
  orgId: string;
  definitionId: number;
  objectType: HrWorkflowObjectType;
  objectId: string;
  requestedBy: string;
  subjectEmployeeId: string;
  context: Record<string, unknown>;
  status: HrWorkflowInstanceStatus;
  currentStepOrder: number;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  requesterName?: string | null;
  requesterEmail?: string;
  requester?: HrWorkflowUser;
  subjectEmployee?: HrWorkflowUser;
  timeline?: HrWorkflowStepAction[];
}

export interface HrWorkflowDelegation {
  id: number;
  orgId: string;
  delegatorUserId: string;
  delegateUserId: string;
  objectType: HrWorkflowObjectType | null;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  active: boolean;
  createdAt: string;
  delegateName: string | null;
  delegateEmail: string | null;
}

export interface PaginatedResult<T> {
  data: T[];
  total?: number;
  page: number;
  limit: number;
}

export interface CursorPaginatedResult<T> {
  data: T[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}
