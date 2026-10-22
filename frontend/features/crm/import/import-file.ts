import { CsvParseError, parseCsv } from "@/lib/csv-parse";


export interface ImportFileContents {
  readonly filename: string;
  readonly headers: string[];
  readonly rows: string[][];
}

export const IMPORT_FILE_ACCEPT =
  ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const READABLE = [".csv", ".xlsx"];

export class ImportFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportFileError";
  }
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

export function isReadableImportFile(name: string): boolean {
  const extension = extensionOf(name);
  return READABLE.includes(extension) || extension === ".xls";
}

export async function readImportFile(file: File): Promise<ImportFileContents> {
  const extension = extensionOf(file.name);

  if (extension === ".xls")
    throw new ImportFileError(
      "That is an old-format .xls workbook, which this cannot read. Open it in Excel and save it as .xlsx or CSV.",
    );

  if (!READABLE.includes(extension))
    throw new ImportFileError("That file is not a CSV or an Excel workbook. Use .csv or .xlsx.");

  const table =
    extension === ".csv"
      ? readCsv(await file.text())
      : await readWorkbook(await file.arrayBuffer());

  if (table.headers.length === 0) throw new ImportFileError("That file has no header row.");

  return { filename: file.name, ...table };
}

function readCsv(text: string): { headers: string[]; rows: string[][] } {
  try {
    const { headers, rows } = parseCsv(text);
    return { headers: [...headers], rows: rows.map((row) => [...row]) };
  } catch (error) {
    if (error instanceof CsvParseError) throw new ImportFileError(error.message);
    throw error;
  }
}

async function readWorkbook(buffer: ArrayBuffer): Promise<{ headers: string[]; rows: string[][] }> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new ImportFileError("That workbook has no sheets in it.");

  const table: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      while (cells.length < columnNumber - 1) cells.push("");
      cells[columnNumber - 1] = cellText(cell.value).trim();
    });
    table.push(cells);
  });

  for (const cells of table) while (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();

  const [headers = [], ...body] = table;
  const rows = body.filter((cells) => cells.length > 0);

  const width = Math.max(headers.length, ...rows.map((cells) => cells.length), 0);
  const pad = (cells: string[]) => {
    while (cells.length < width) cells.push("");
    return cells;
  };

  return { headers: pad(headers), rows: rows.map(pad) };
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);

  if (typeof value === "object") {
    const cell = value as {
      richText?: { text?: unknown }[];
      text?: unknown;
      result?: unknown;
      error?: unknown;
    };
    if (Array.isArray(cell.richText)) return cell.richText.map((part) => String(part.text ?? "")).join("");
    if (cell.text !== undefined) return String(cell.text);
    if (cell.result !== undefined) return cellText(cell.result);
    if (cell.error !== undefined) return "";
    return "";
  }

  return String(value);
}
