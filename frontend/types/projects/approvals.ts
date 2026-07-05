export type ApprovalEntityType =
  | "task"
  | "milestone"
  | "budget"
  | "release"
  | "change_request"
  | "document"
  | "timesheet"
  | "client_approval";

export type ApprovalStatus =
  | "requested"
  | "pending"
  | "approved"
  | "rejected"
  | "changes_requested"
  | "escalated"
  | "cancelled";

export interface Approval {
  id: number;
  projectId: number;
  entityType: ApprovalEntityType;
  entityId: number;
  title: string;
  requestedById: string | null;
  approverId: string | null;
  status: ApprovalStatus;
  level: number;
  dueAt: string | null;
  decisionComment: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalInboxItem {
  id: number;
  projectId: number;
  projectName: string;
  projectKey: string;
  entityType: ApprovalEntityType;
  entityId: number;
  title: string;
  status: ApprovalStatus;
  level: number;
  dueAt: string | null;
  requestedById: string | null;
  decidedAt: string | null;
}

export interface CreateApprovalInput {
  entityType: ApprovalEntityType;
  entityId: number;
  title: string;
  approverId: string;
  dueAt?: string;
  level?: number;
}

export interface DecideApprovalInput {
  decision: "approved" | "rejected" | "changes_requested";
  decisionComment?: string;
}

export interface UpdateApprovalInput {
  approverId?: string;
  dueAt?: string;
  status?: ApprovalStatus;
}
