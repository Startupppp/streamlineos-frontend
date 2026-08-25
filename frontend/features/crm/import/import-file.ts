import { CsvParseError, parseCsv } from "@/lib/csv-parse";

/**
 * Turning a file somebody dropped on the import page into a table.
 *
 * One reader for every entity on the page. The three dialogs this page absorbed
 * each carried their own copy, and the copies had drifted: all three split CSV
 * on `,` and `\n` with no quote handling at all, which silently shifts every
 * column right of the first quoted comma. That is the failure this exists to
 * stop, so CSV goes through `parseCsv` — which refuses a file it cannot read
 * unambiguously rather than reading it approximately.
 */

export interface ImportFileContents {
  readonly filename: string;
  readonly headers: string[];
  readonly rows: string[][];
}

/** What the file picker offers. */
export const IMPORT_FILE_ACCEPT =
  ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * A file this reader can open.
 *
 * `.xls` is deliberately absent. The dialogs advertised it, and could never
 * read one: ExcelJS reads the zipped XML of `.xlsx` and has no BIFF parser, so
 * every `.xls` ended at the same unhelpful "Failed to parse file". Refused by
 * name below instead, with the one instruction that fixes it.
 */
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

/** Whether this file is worth handing to `readImportFile` at all. */
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
    // Re-typed rather than re-worded: `parseCsv` writes its messages for the
    // person holding the file, and they are better than anything said here.
    if (error instanceof CsvParseError) throw new ImportFileError(error.message);
    throw error;
  }
}

/**
 * The first sheet of a workbook, as text.
 *
 * ExcelJS is loaded on demand. It is a large dependency that only an Excel
 * upload needs, and the import page should not carry it for the CSV case.
 */
async function readWorkbook(buffer: ArrayBuffer): Promise<{ headers: string[]; rows: string[][] }> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new ImportFileError("That workbook has no sheets in it.");

  const table: string[][] = [];
  // `includeEmpty: false` skips blank leading rows, so the header is whatever
  // the sheet actually starts with rather than whatever sits in row 1.
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      // Written by column number rather than pushed: `eachCell` skips columns
      // that hold nothing, and pushing would slide every later value left.
      while (cells.length < columnNumber - 1) cells.push("");
      cells[columnNumber - 1] = cellText(cell.value).trim();
    });
    table.push(cells);
  });

  // Trailing empties are formatting, not data — a sheet whose columns were
  // styled to Z would otherwise arrive with twenty-odd nameless columns for a
  // person to skip one at a time.
  for (const cells of table) while (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();

  const [headers = [], ...body] = table;
  const rows = body.filter((cells) => cells.length > 0);

  // Every row the same width as the widest, so a short row reads as empty
  // cells rather than as missing columns.
  const width = Math.max(headers.length, ...rows.map((cells) => cells.length), 0);
  const pad = (cells: string[]) => {
    while (cells.length < width) cells.push("");
    return cells;
  };

  return { headers: pad(headers), rows: rows.map(pad) };
}

/**
 * What a spreadsheet cell says, as a person reading the sheet would see it.
 *
 * A cell is not always a string. `String(value)` on a formula cell prints
 * `[object Object]`, and on a date prints a locale-and-timezone-dependent
 * sentence that no date parser downstream accepts — which is how an
 * `Expected close date` column arrives as `Wed Dec 31 2025 00:00:00 GMT+0530`.
 */
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
    // A hyperlink cell carries both; the text is what the sheet shows.
    if (cell.text !== undefined) return String(cell.text);
    if (cell.result !== undefined) return cellText(cell.result);
    // `#REF!` and friends are the absence of a value, not a value.
    if (cell.error !== undefined) return "";
    return "";
  }

  return String(value);
}
