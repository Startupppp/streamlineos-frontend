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
  orgId: string;
  projectId: number | null;
  entityType: string;
  entityId: number;
  title: string;
  reason: string | null;
  requestedById: string | null;
  approverMembershipId: number | null;
  status: string;
  level: number;
  dueAt: string | null;
  decisionComment: string | null;
  decidedAt: string | null;
  createdBy: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalInboxItem {
  id: number;
  projectId: number | null;
  projectName: string | null;
  projectKey: string | null;
  entityType: string;
  entityId: number;
  title: string;
  status: string;
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
  reason?: string;
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
