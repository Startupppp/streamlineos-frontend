
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
  matchedRecordId?: string;
  duplicateOfRow?: number;
  match?: { score: number; signals: string[]; candidateName?: string };
}

export interface ImportSummary {
  create: number;
  update: number;
  merge: number;
  review: number;
  skip: number;
  total: number;
}

export interface ImportPreview {
  crmImportId: string;
  columns: MappedColumn[];
  needsConfirmation: MappedColumn[];
  summary: ImportSummary;
  rows: PlannedRow[];
  warnings: string[];
}

export interface ImportProgress {
  crmImportId: string;
  status: "previewing" | "committing" | "committed" | "reverting" | "reverted" | "failed";
  workflowRunId: string | null;
  runStatus: string | null;
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

export const EXPORT_ENTITIES = [
  "parties",
  "contacts",
  "subjects",
  "activities",
  "deals",
  "pipelines",
] as const;
