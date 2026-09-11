import type { PermissionKey } from "@/lib/rbac/permissions";

/** A cell as it leaves the mapper: text, or nothing if the column was skipped. */
export type Cell = (field: string) => string | undefined;

export type BulkValue = string | number | string[] | undefined;
export type BulkRow = Record<string, BulkValue>;

/** Whatever the endpoint says it did. The three disagree on the words. */
export interface BulkImportResult {
  imported?: number;
  created?: number;
  updated?: number;
  skipped?: number;
  failed?: number;
  duplicatesFound?: number;
  distributed?: number;
  salesPeopleCount?: number;
  errors?: { row: number; message: string }[];
}

export interface BulkField {
  key: string;
  label: string;
  /** Headers this field answers to. Compared after `normaliseHeader`. */
  aliases: string[];
  /** Exactly one field per entity carries this, and nothing runs without it. */
  required?: true;
}

export interface BulkPreviewColumn {
  key: string;
  header: string;
  kind?: "text" | "badge" | "money";
}

export type BulkEntityId = "leads" | "contacts" | "deals";

export interface BulkEntity {
  id: BulkEntityId;
  /** Tab label. */
  label: string;
  /** "3 leads", "1 lead". */
  noun: [singular: string, plural: string];
  permission: PermissionKey;
  endpoint: string;
  /** What the endpoint refuses in one call, so the page can say so first. */
  maxRows: number;
  fields: BulkField[];
  columns: BulkPreviewColumn[];
  /** A file that shows the shape, for somebody who has nothing to start from. */
  template: string;
  /** Everything this write invalidates, beyond the CRM as a whole. */
  queryKey: readonly unknown[];
  /** The one choice this entity's import offers, if it offers one. */
  option?: { key: "autoDistribute"; label: string; hint: string };
  /**
   * One mapped row, as the endpoint takes it — or why this row cannot go.
   *
   * A rejected row is reported against its line number and left out; it is
   * never guessed at. The alternative is importing an approximation of
   * somebody's data, and nothing downstream would ever reveal the difference.
   *
   * `notes` is for the middle case: a cell the endpoint would refuse, on a row
   * that is fine without it. Dropping it costs one field; sending it costs the
   * whole batch, because every one of these endpoints validates its array as a
   * unit and rejects all five hundred rows over one malformed address. Dropping
   * it *quietly* is the option not taken.
   */
  build: (cell: Cell) => { row: BulkRow; notes?: string[] } | { error: string };
  /** The request body. */
  body: (rows: BulkRow[], autoDistribute: boolean) => Record<string, unknown>;
  /** What happened, in one line. */
  summarise: (result: BulkImportResult) => string;
}

/**
 * A header, reduced to what it means.
 *
 * Everything that is not a letter or a digit goes, on both the header and the
 * alias, so `First Name`, `first_name`, `FIRSTNAME` and `First-Name` are one
 * thing. The dialogs each normalised a little differently and one of them
 * normalised only the header — which is why `lead_name` matched nothing there
 * while `lead name` matched.
 */
function normaliseHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** The field a header names, if any. */
export function matchField(entity: BulkEntity, header: string): string | null {
  const normalised = normaliseHeader(header);
  if (normalised === "") return null;
  for (const field of entity.fields) {
    if (normaliseHeader(field.key) === normalised) return field.key;
    if (field.aliases.some((alias) => normaliseHeader(alias) === normalised)) return field.key;
  }
  return null;
}

export function requiredFieldOf(entity: BulkEntity): BulkField {
  const required = entity.fields.find((field) => field.required);
  // Every entity below declares one. Typed as non-optional for callers rather
  // than left for each of them to handle a case that cannot happen.
  return required ?? entity.fields[0];
}
