import type { RecordLayout } from "@/lib/renderer/layout";

/**
 * Internal issues, internal tasks and customer complaints.
 *
 * Three record types, not three modules, and nothing in this file describes a
 * screen. The server sends the layout; the renderer turns it into a list, a
 * detail view and a form. What is declared here is only what a caller cannot get
 * from a layout: the identifiers a mutation needs, and the ledger that travels
 * beside a record.
 *
 * `IssueRecordLayout` is a `RecordLayout` with one field added rather than a
 * parallel shape. `src/modules/issues/issue-record-types.ts` mirrors
 * `RecordLayout` exactly on purpose, so anything that translated between them
 * here would be a third definition to keep in step.
 */

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

/**
 * The stages a record can be moved to from the ordinary transition route.
 *
 * `escalated` is absent because it has its own route and its own permission
 * key — raising a record above its owner is a different authority from working
 * it, and offering it in the same control would make that key optional.
 */
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

/**
 * A row in the shape the renderer reads: field names at the top level.
 *
 * Deliberately open. The layout decides which fields exist, so a client that
 * enumerated them would have to be redeployed whenever the server's declaration
 * grew a field — which is precisely the coupling serving layouts as data removes.
 * The two keys named are the ones a caller addresses a record by, and they are
 * not layout fields.
 */
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
  /** Served with the rows so a list never renders against a stale description. */
  layout: IssueRecordLayout;
  data: IssueRecord[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
}

export interface IssueDetailResponse {
  layout: IssueRecordLayout;
  record: IssueRecord;
  /**
   * Every move this record has made, newest first. Travels with the record
   * rather than behind a second call: "who escalated this and why" is the first
   * question anyone opening a complaint asks.
   */
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

/**
 * Nullable where create is merely optional: clearing an owner, a due date or a
 * deal anchor are all real edits, and `undefined` cannot express them.
 */
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
