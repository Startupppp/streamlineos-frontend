import type { RecordLayout } from "@/lib/renderer/layout";


export const ISSUE_RECORD_TYPES = ["issue", "task", "complaint"] as const;
export type IssueRecordType = (typeof ISSUE_RECORD_TYPES)[number];

export const ISSUE_SEVERITIES = ["high", "medium", "low"] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export const ISSUE_STAGES = [
  "open",
  "acknowledged",
  "escalated",
  "resolved",
  "dismissed",
] as const;
export type IssueStage = (typeof ISSUE_STAGES)[number];

export const ISSUE_TRANSITION_STAGES = [
  "open",
  "acknowledged",
  "resolved",
  "dismissed",
] as const;
export type IssueTransitionStage = (typeof ISSUE_TRANSITION_STAGES)[number];

export interface IssueRecordLayout extends RecordLayout {
  recordType: IssueRecordType;
}

export type IssueRecord = Record<string, unknown> & {
  issueRecordId: string;
  recordType: IssueRecordType;
};

export interface IssueTransition {
  issueStageTransitionId: string;
  fromStage: IssueStage | null;
  toStage: IssueStage;
  actorKind: string;
  actorLabel: string | null;
  actorUserId: string | null;
  actorName: string | null;
  reason: string | null;
  occurredAt: string;
}

export interface IssueRecordTypesResponse {
  recordTypes: IssueRecordLayout[];
}

export interface IssuePage {
  layout: IssueRecordLayout;
  data: IssueRecord[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

export interface IssueDetailResponse {
  layout: IssueRecordLayout;
  record: IssueRecord;
  transitions: IssueTransition[];
}

export interface IssueFilters {
  stage?: IssueStage;
  severity?: IssueSeverity;
  ownerUserId?: string;
  partyId?: string;
  openOnly?: boolean;
  overdueOnly?: boolean;
  order?: "oldest" | "newest";
}

export interface CreateIssueInput {
  recordType: IssueRecordType;
  title: string;
  severity: IssueSeverity;
  details?: string;
  reference?: string;
  ownerUserId?: string;
  partyId?: string;
  dealId?: number;
  dueAt?: string;
}

export interface UpdateIssueInput {
  title?: string;
  severity?: IssueSeverity;
  details?: string | null;
  reference?: string | null;
  ownerUserId?: string | null;
  partyId?: string | null;
  dealId?: number | null;
  dueAt?: string | null;
}

export const STAGE_LABELS: Record<IssueStage, string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  escalated: "Escalated",
  resolved: "Resolved",
  dismissed: "Dismissed",
};
