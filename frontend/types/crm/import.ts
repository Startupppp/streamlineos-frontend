/** Bringing a CRM export in, and taking everything back out. */

/**
 * What a planned import lands a file on.
 *
 * Here rather than beside the descriptors in `features/crm/import` because the
 * shared Query hook needs it, and a shared module may not import from a
 * feature — see root CLAUDE.md §9.
 */
export type PlannedEntity = "party" | "subject" | "pipeline" | "activity";

export type RowAction = "create" | "update" | "merge" | "review" | "skip";

export type ColumnMapping =
  | { kind: "mapped"; field: string; confidence: number }
  | { kind: "custom"; key: string }
  | { kind: "ambiguous"; candidates: string[] }
  | { kind: "unmapped" };

export interface MappedColumn {
  header: string;
  mapping: ColumnMapping;
}

export interface PlannedRow {
  rowNumber: number;
  action: RowAction;
  reason: string;
  values: Record<string, string>;
  customFields: Record<string, string>;
  /**
   * The record this row matched, whatever kind of record the import targets.
   *
   * Was `matchedPartyId` while an import could only ever write parties.
   */
  matchedRecordId?: string;
  duplicateOfRow?: number;
  /** Why the planner thinks this row is a near-match, when it does. */
  match?: { score: number; signals: string[]; candidateName?: string };
}

export interface ImportSummary {
  create: number;
  update: number;
  /** Folded into an earlier row of the same file, whose gaps it filled. */
  merge: number;
  /** Close enough to an existing party to be worth a person's judgement, so not written. */
  review: number;
  skip: number;
  total: number;
}

export interface ImportPreview {
  crmImportId: string;
  columns: MappedColumn[];
  /** Columns a person has to answer for before this can run. */
  needsConfirmation: MappedColumn[];
  summary: ImportSummary;
  /** A sample. A preview that ships ten thousand rows is one nobody waits for. */
  rows: PlannedRow[];
  /**
   * Things the plan is honest about but cannot fix by itself — today only that
   * the candidate set for duplicate matching was truncated. Shown rather than
   * logged: the tenant is about to approve this.
   */
  warnings: string[];
}

/**
 * Where an import has got to.
 *
 * The commit is a durable workflow now, so this is the shape of a job rather
 * than the result of a call: the same payload comes back from starting it, from
 * polling it, and from reverting it.
 */
export interface ImportProgress {
  crmImportId: string;
  status: "previewing" | "committing" | "committed" | "reverting" | "reverted" | "failed";
  workflowRunId: string | null;
  runStatus: string | null;
  /**
   * The only terminating condition.
   *
   * Deliberately not "did anything change this call" — a call that lands between
   * attempts legitimately reports zero progress and is not a failure. The
   * previous inline implementation could treat no-progress as unrecoverable
   * because a stalled pass genuinely could not be helped by asking again; that
   * stopped being true the moment the write became durable.
   */
  complete: boolean;
  total: number;
  remaining: number;
  created: number;
  updated: number;
  merged: number;
  review: number;
  skipped: number;
  failed: number;
  reverted: number;
  /** After this, the import can no longer be taken back. */
  revertDeadlineAt: string | null;
}

export const IMPORT_FIELDS = [
  "name",
  "legalName",
  "displayName",
  "email",
  "phone",
  "website",
  "taxNumber",
  "notes",
  "partyType",
  "status",
] as const;

export const IMPORT_FIELD_LABELS: Record<string, string> = {
  name: "Name",
  legalName: "Legal name",
  displayName: "Display name",
  email: "Email",
  phone: "Phone",
  website: "Website",
  taxNumber: "Tax number",
  notes: "Notes",
  partyType: "Type",
  status: "Status",
};

export const EXPORT_ENTITIES = ["parties", "contacts", "subjects", "activities"] as const;
export type ExportEntity = (typeof EXPORT_ENTITIES)[number];
