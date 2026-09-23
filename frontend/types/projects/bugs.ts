export type BugSeverity = "blocker" | "critical" | "major" | "minor" | "trivial";
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
  ticketNumber: number;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  assigneeMembershipId: number | null;
  reporterId: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  qaState: string | null;
  severity: string | null;
  stepsToReproduce: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  environment: string | null;
  browserDevice: string | null;
  affectedReleaseId: number | null;
  fixedReleaseId: number | null;
  qaOwnerUserId: string | null;
  qaOwnerMembershipId: number | null;
  linkedTestCaseId: number | null;
  reopenCount: number | null;
  createdByUserId: string | null;
}

