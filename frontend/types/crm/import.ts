/** Bringing a CRM export in, and taking everything back out. */

export type RowAction = "create" | "update" | "skip";

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
  matchedPartyId?: string;
  duplicateOfRow?: number;
}

export interface ImportSummary {
  create: number;
  update: number;
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

export interface CommitResult {
  created: number;
  updated: number;
  failed: number;
  /** Rows the server did not reach before its time budget ran out. */
  remaining: number;
  /**
   * Whether the import finished. The server commits under a 20-second budget
   * and leaves the import open when it runs out, so a large file takes several
   * calls — `false` means call again, it does not mean anything failed.
   */
  complete: boolean;
}

export interface RevertResult {
  deleted: number;
  restored: number;
}

/** The fields a column can be pointed at, plus the answer "not this one". */
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
