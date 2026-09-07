export type BugSeverity = "blocker" | "critical" | "major" | "minor" | "trivial";
export type BugPriority = "low" | "medium" | "high" | "urgent";
export type BugStatus =
  | "new"
  | "triaged"
  | "assigned"
  | "in_progress"
  | "fixed"
  | "ready_for_qa"
  | "verified"
  | "reopened"
  | "closed";

export interface Bug {
  id: number;
  orgId: string;
  projectId: number;
  bugNumber: number;
  title: string;
  description: string | null;
  severity: string;
  priority: string;
  status: string;
  stepsToReproduce: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  environment: string | null;
  browserDevice: string | null;
  affectedReleaseId: number | null;
  fixedReleaseId: number | null;
  assigneeMembershipId: number | null;
  reporterId: string | null;
  qaOwnerId: string | null;
  qaOwnerMembershipId: number | null;
  reopenCount: number;
  linkedTicketId: number | null;
  linkedTestCaseId: number | null;
  createdBy: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBugInput {
  title: string;
  description?: string;
  severity?: BugSeverity;
  priority?: BugPriority;
  status?: BugStatus;
  stepsToReproduce?: string;
  expectedResult?: string;
  actualResult?: string;
  environment?: string;
  browserDevice?: string;
  affectedReleaseId?: number;
  fixedReleaseId?: number;
  assigneeId?: string;
  qaOwnerId?: string;
  linkedTicketId?: number;
  linkedTestCaseId?: number;
}

export type UpdateBugInput = Partial<CreateBugInput>;
