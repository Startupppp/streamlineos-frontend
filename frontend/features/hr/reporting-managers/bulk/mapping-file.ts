import { downloadXlsx } from "@/lib/export/xlsx-utils";
import {
  BULK_REASSIGNMENT_ROW_CAP,
  type BulkReassignmentRowInput,
} from "@/hooks/api/hr/reporting-line-bulk-jobs-schema";

/**
 * The bulk reporting-change mapping file (PRD §7.6.1). Header matching mirrors the
 * backend's one manager-column normaliser (`reporting-manager-columns.ts`): case,
 * spaces, `_` and `-` are ignored, and the legacy single-manager headers read as
 * `primaryManagerEmail`. The server re-validates every row; this only shapes them.
 */

export const MAPPING_COLUMNS = [
  { key: "employeeEmail", required: "Yes", notes: "Work email of the employee whose manager changes", sample: "priya.sharma@company.com" },
  { key: "primaryManagerEmail", required: "No", notes: "New primary reporting manager. Blank leaves the primary manager unchanged", sample: "manager@company.com" },
  { key: "secondaryManagerEmail1", required: "No", notes: "Additional (dotted-line) manager, only if your policy allows one", sample: "" },
  { key: "secondaryManagerEmail2", required: "No", notes: "Only if your policy allows two", sample: "" },
  { key: "secondaryManagerEmail3", required: "No", notes: "Only if your policy allows three", sample: "" },
  { key: "effectiveFrom", required: "No", notes: "YYYY-MM-DD. Blank uses the job's date, or today in your organisation", sample: "" },
  { key: "reason", required: "No", notes: "Why this employee's manager changes. Required when they have already changed manager several times in 24 hours", sample: "" },
] as const;

type MappingKey = (typeof MAPPING_COLUMNS)[number]["key"];

const LEGACY_PRIMARY_HEADERS = ["reportingManagerEmail", "reportsTo", "managerEmail"];

function headerKey(header: string): string {
  return header.toLowerCase().replace(/[\s_-]/g, "");
}

const KEY_BY_HEADER = new Map<string, MappingKey>([
  ...MAPPING_COLUMNS.map((column): [string, MappingKey] => [headerKey(column.key), column.key]),
  ...LEGACY_PRIMARY_HEADERS.map((header): [string, MappingKey] => [headerKey(header), "primaryManagerEmail"]),
]);

export function normalizeMappingHeader(header: string): MappingKey | null {
  return KEY_BY_HEADER.get(headerKey(header)) ?? null;
}

export interface ParsedMapping {
  rows: BulkReassignmentRowInput[];
  errors: string[];
}

/** Rows keyed by raw header → canonical input rows. Row numbers in errors are sheet rows (header = 1). */
export function mapMappingRows(raw: Array<Record<string, string>>): ParsedMapping {
  const rows: BulkReassignmentRowInput[] = [];
  const errors: string[] = [];
  raw.forEach((source, index) => {
    const row: Partial<Record<MappingKey, string>> = {};
    for (const [header, value] of Object.entries(source)) {
      const key = normalizeMappingHeader(header);
      const trimmed = (value ?? "").trim();
      if (key && trimmed && !row[key]) row[key] = key === "reason" || key === "effectiveFrom" ? trimmed : trimmed.toLowerCase();
    }
    if (Object.keys(row).length === 0) return;
    if (!row.employeeEmail) {
      errors.push(`Row ${index + 2}: employeeEmail is required`);
      return;
    }
    rows.push({
      employeeEmail: row.employeeEmail,
      ...(row.primaryManagerEmail ? { primaryManagerEmail: row.primaryManagerEmail } : {}),
      ...(row.secondaryManagerEmail1 ? { secondaryManagerEmail1: row.secondaryManagerEmail1 } : {}),
      ...(row.secondaryManagerEmail2 ? { secondaryManagerEmail2: row.secondaryManagerEmail2 } : {}),
      ...(row.secondaryManagerEmail3 ? { secondaryManagerEmail3: row.secondaryManagerEmail3 } : {}),
      ...(row.effectiveFrom ? { effectiveFrom: row.effectiveFrom } : {}),
      ...(row.reason ? { reason: row.reason } : {}),
    });
  });
  if (rows.length > BULK_REASSIGNMENT_ROW_CAP)
    errors.push(`A file may change at most ${BULK_REASSIGNMENT_ROW_CAP} employees; this one has ${rows.length}.`);
  return { rows, errors };
}

function cellText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "text" in value) return String(value.text ?? "");
  if (typeof value === "object" && "result" in value) return String(value.result ?? "");
  return String(value);
}

export async function parseMappingFile(file: File): Promise<ParsedMapping> {
  if (file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv") {
    const Papa = (await import("papaparse")).default;
    const result = Papa.parse<Record<string, string>>(await file.text(), { header: true, skipEmptyLines: true });
    return mapMappingRows(result.data);
  }
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.getWorksheet("Mapping") ?? workbook.worksheets[0];
  if (!sheet) return { rows: [], errors: ["The file has no worksheet."] };
  const headers: string[] = [];
  sheet.getRow(1).eachCell((cell, column) => {
    headers[column - 1] = cellText(cell.value).trim();
  });
  const raw: Array<Record<string, string>> = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const entry: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) entry[header] = cellText(row.getCell(index + 1).value);
    });
    raw.push(entry);
  });
  return mapMappingRows(raw);
}

export async function downloadMappingTemplate(): Promise<void> {
  const sample: Record<string, unknown> = {};
  for (const column of MAPPING_COLUMNS) sample[column.key] = column.sample;
  await downloadXlsx("reporting-change-template.xlsx", [
    {
      name: "Mapping",
      columns: MAPPING_COLUMNS.map((column) => ({ header: column.key, key: column.key, width: 28 })),
      rows: [sample],
    },
    {
      name: "Instructions",
      columns: [
        { header: "Field", key: "field", width: 24 },
        { header: "Required", key: "required", width: 10 },
        { header: "Notes", key: "notes", width: 80 },
      ],
      rows: [
        ...MAPPING_COLUMNS.map((column) => ({ field: column.key, required: column.required, notes: column.notes })),
        { field: "", required: "", notes: "" },
        {
          field: "Limits",
          required: "",
          notes: `Up to ${BULK_REASSIGNMENT_ROW_CAP} employees per file. Nothing changes until you review the preview and commit. The old reportingManagerEmail, reportsTo and managerEmail headers are still read as primaryManagerEmail.`,
        },
      ],
    },
  ]);
}
