import { normalizeHeader, type ColumnKey, type ParsedRow } from "./bulk-onboard-columns";

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
  data: Record<string, string>[],
): ParsedRow[] {
  const keyMap = new Map<string, ColumnKey>();
  for (const h of headers) {
    const mapped = normalizeHeader(h);
    if (mapped) keyMap.set(h, mapped);
  }

  return data.map((row) => {
    const out: ParsedRow = {};
    for (const [header, value] of Object.entries(row)) {
      const key = keyMap.get(header) ?? normalizeHeader(header);
      if (key) out[key] = value ?? "";
    }
    return out;
  });
}

export async function parseFile(file: File): Promise<ParsedRow[]> {
  if (file.name.endsWith(".csv") || file.type === "text/csv") {
    const Papa = (await import("papaparse")).default;
    const text = await file.text();
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });
    return mapRawRows(result.meta.fields ?? [], result.data);
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

  const dataRows: Record<string, string>[] = [];
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
    if (!empty) dataRows.push(entry);
  });

  return mapRawRows(headers.filter(Boolean), dataRows);
}
