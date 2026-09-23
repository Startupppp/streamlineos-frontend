import { importPreviewValuesSchema, type ImportFormat } from "./import-export-contract";

export type ColumnMappingState = "MAPPED" | "IGNORED" | "UNKNOWN";

export interface ColumnMapping {
  column: string;
  field: string | null;
  state: ColumnMappingState;
}

export const IMPORTABLE_FIELDS: readonly string[] = Object.keys(
  importPreviewValuesSchema.shape,
);

export const IGNORED_SOURCE_COLUMNS: readonly string[] = [
  "id",
  "ticketNumber",
  "ticketKey",
  "projectId",
  "orgId",
  "createdAt",
  "updatedAt",
];

const JSON_KEY_SAMPLE_ROWS = 50;

const fieldByKey = new Map(
  IMPORTABLE_FIELDS.map((field) => [field.toLowerCase(), field]),
);

const ignoredKeys = new Set(IGNORED_SOURCE_COLUMNS.map((name) => name.toLowerCase()));

function splitCsvHeader(line: string): string[] {
  const columns: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char !== '"') {
        current += char;
        continue;
      }
      if (line[index + 1] === '"') {
        current += '"';
        index += 1;
        continue;
      }
      quoted = false;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      columns.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  columns.push(current);
  return columns.map((column) => column.trim());
}

function csvColumns(content: string): string[] {
  const header = content
    .split(/\r?\n/)
    .find((line) => line.trim() !== "");
  if (header === undefined) return [];
  return splitCsvHeader(header).filter((column) => column !== "");
}

function jsonColumns(content: string): string[] {
  let payload: unknown;
  try {
    payload = JSON.parse(content);
  } catch {
    return [];
  }
  if (!Array.isArray(payload)) return [];

  const columns: string[] = [];
  const seen = new Set<string>();
  for (const entry of payload.slice(0, JSON_KEY_SAMPLE_ROWS)) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) continue;
    for (const key of Object.keys(entry as Record<string, unknown>)) {
      if (seen.has(key)) continue;
      seen.add(key);
      columns.push(key);
    }
  }
  return columns;
}

export function readSourceColumns(format: ImportFormat, content: string): string[] {
  return format === "csv" ? csvColumns(content) : jsonColumns(content);
}

export function mapSourceColumns(format: ImportFormat, content: string): ColumnMapping[] {
  return readSourceColumns(format, content).map((column) => {
    const key = column.toLowerCase();
    if (ignoredKeys.has(key)) return { column, field: null, state: "IGNORED" as const };
    const field = fieldByKey.get(key);
    return field === undefined
      ? { column, field: null, state: "UNKNOWN" as const }
      : { column, field, state: "MAPPED" as const };
  });
}

export function unmappedColumns(mappings: readonly ColumnMapping[]): ColumnMapping[] {
  return mappings.filter((mapping) => mapping.state === "UNKNOWN");
}
