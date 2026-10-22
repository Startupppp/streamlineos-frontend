import { collectManagerColumns, resolveManagerHeader } from "@/components/hr/reporting-lines/manager-columns";
import { BULK_ONBOARD_COLUMNS, CONFLICT_KEY, LEGACY_PRIMARY_KEY, SOURCE_ROW_KEY, normalizeHeader, type ColumnKey, type ParsedRow } from "./bulk-onboard-columns";

interface SourceRow {
  values: Record<string, string>;
  sourceRow: number;
}

function isBlankRow(values: Record<string, string | undefined>): boolean {
  return Object.values(values).every((value) => !(value ?? "").trim());
}

function formatLocalDate(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function excelCellToString(cell: { text?: string; value?: unknown }): string {
  const value = cell.value;
  if (value == null || value === "") return "";
  if (value instanceof Date) {
    return formatLocalDate(value);
  }
  if (typeof value === "object" && value !== null && "result" in value) {
    const result = value.result;
    if (result instanceof Date) return formatLocalDate(result);
    if (result != null) return String(result).trim();
  }
  if (typeof value === "object" && value !== null && "text" in value) {
    return String(value.text ?? "").trim();
  }
  if (typeof value === "object" && value !== null && "richText" in value && Array.isArray(value.richText)) {
    return value.richText
      .map((part: unknown) => (typeof part === "object" && part !== null && "text" in part ? String(part.text ?? "") : ""))
      .join("")
      .trim();
  }
  const text = cell.text;
  if (text != null && String(text).trim() !== "") return String(text).trim();
  return String(value).trim();
}

function mapRawRows(
  headers: string[],
  data: SourceRow[],
): ParsedRow[] {
  const keyMap = new Map<string, ColumnKey>();
  for (const h of headers) {
    const mapped = normalizeHeader(h);
    if (mapped) keyMap.set(h, mapped);
  }

  return data.map(({ values: row, sourceRow }) => {
    const out: ParsedRow = { [SOURCE_ROW_KEY]: String(sourceRow) };
    const conflicts = new Set<string>();
    for (const [header, value] of Object.entries(row)) {
      if (resolveManagerHeader(header)) continue;
      const key = keyMap.get(header) ?? normalizeHeader(header);
      if (!key) continue;
      const next = (value ?? "").trim();
      const previous = (out[key] ?? "").trim();
      if (previous && next && previous.toLowerCase() !== next.toLowerCase()) conflicts.add(key);
      if (!previous || next) out[key] = value ?? "";
      if (previous && !next) out[key] = previous;
    }
    const managers = collectManagerColumns(row);
    Object.assign(out, managers.values);
    for (const column of managers.conflicts) conflicts.add(column);
    if (managers.legacyPrimaryHeader) out[LEGACY_PRIMARY_KEY] = managers.legacyPrimaryHeader;
    if (conflicts.size > 0) out[CONFLICT_KEY] = [...conflicts].join(",");
    return out;
  });
}

export function missingRequiredHeaders(rows: ParsedRow[]): string[] {
  const first = rows[0] ?? {};
  return BULK_ONBOARD_COLUMNS.filter((column) => column.required && !(column.key in first)).map(
    (column) => column.header,
  );
}

function extraValues(values: Record<string, unknown>): unknown[] {
  const extra: unknown = values.__parsed_extra;
  return Array.isArray(extra) ? extra : [];
}

function withoutExtra(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).filter(([key]) => key !== "__parsed_extra"));
}

function extraCount(values: Record<string, unknown>): number {
  return extraValues(values).length;
}

function filledExtraCount(values: Record<string, unknown>): number {
  return extraValues(values).filter((value) => String(value ?? "").trim() !== "").length;
}

export class ParseStructuralError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseStructuralError";
  }
}

export async function parseFile(file: File): Promise<ParsedRow[]> {
  if (file.name.endsWith(".csv") || file.type === "text/csv") {
    const Papa = (await import("papaparse")).default;
    const text = await file.text();
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: false,
      transformHeader: (h) => h.trim(),
    });
    const structuralError = result.errors.find((e) => e.type === "Quotes");
    if (structuralError) {
      const fileLineNumber = (structuralError.row ?? 0) + 1;
      throw new ParseStructuralError(`Line ${fileLineNumber}: unclosed quote`);
    }
    const headers = result.meta.fields ?? [];
    const overfull = result.data.findIndex((values) => filledExtraCount(values) > 0);
    const overfullRow = result.data[overfull];
    if (overfullRow !== undefined) {
      const columns = headers.length + extraCount(overfullRow);
      throw new ParseStructuralError(
        `Line ${overfull + 2} has ${columns} columns; expected ${headers.length}. Wrap any value that contains a comma in double quotes.`,
      );
    }
    const rows = result.data
      .map((values, index) => ({ values: withoutExtra(values), sourceRow: index + 1 }))
      .filter((row) => !isBlankRow(row.values));
    return mapRawRows(headers, rows);
  }

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet =
    workbook.getWorksheet("Employees") ?? workbook.worksheets[0];
  if (!worksheet) throw new Error("No worksheet found in file");

  const firstRow = worksheet.getRow(1);
  const headers: string[] = [];
  firstRow.eachCell({ includeEmpty: false }, (cell, col) => {
    headers[col - 1] = String(cell.text ?? "").trim();
  });

  const dataRows: SourceRow[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const entry: Record<string, string> = {};
    let empty = true;
    headers.forEach((header, idx) => {
      if (!header) return;
      const val = excelCellToString(row.getCell(idx + 1));
      if (val) empty = false;
      entry[header] = val;
    });
    if (!empty) dataRows.push({ values: entry, sourceRow: rowNumber - 1 });
  });

  return mapRawRows(headers.filter(Boolean), dataRows);
}
