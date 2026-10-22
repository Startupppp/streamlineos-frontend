import type { PermissionKey } from "@/lib/rbac/permissions";

export type Cell = (field: string) => string | undefined;

export type BulkValue = string | number | string[] | undefined;
export type BulkRow = Record<string, BulkValue>;

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
  aliases: string[];
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
  label: string;
  noun: [singular: string, plural: string];
  permission: PermissionKey;
  endpoint: string;
  maxRows: number;
  fields: BulkField[];
  columns: BulkPreviewColumn[];
  template: string;
  option?: { key: "autoDistribute"; label: string; hint: string };
  build: (cell: Cell) => { row: BulkRow; notes?: string[] } | { error: string };
  body: (rows: BulkRow[], autoDistribute: boolean) => Record<string, unknown>;
  summarise: (result: BulkImportResult) => string;
}

function normaliseHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

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
  return required ?? entity.fields[0];
}
