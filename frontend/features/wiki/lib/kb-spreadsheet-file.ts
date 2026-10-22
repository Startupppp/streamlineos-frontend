import type { KbWorkbookCell } from "@/hooks/api/kb/kb-pages-schema";
import type { KbWorkbookInput, KbWorkbookSheetInput } from "@/hooks/api/kb/page-types";
import type { FortuneSheet } from "./kb-workbook-convert";
import type { Font } from "exceljs";

export const KB_SPREADSHEET_ACCEPT =
  ".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const MAX_SHEETS = 50;
const MAX_CELLS = 200_000;
const MAX_JSON_BYTES = 5 * 1024 * 1024;

type KbWorkbookCellType = NonNullable<KbWorkbookCell["t"]>;
type FortuneCellEntry = { r: number; c: number; v: NonNullable<NonNullable<FortuneSheet["celldata"]>[number]["v"]> };

function sheetEntries(sheet: FortuneSheet): FortuneCellEntry[] {
  const entries: FortuneCellEntry[] = [];
  if (sheet.data) {
    sheet.data.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) entries.push({ r, c, v: cell });
      });
    });
    return entries;
  }
  for (const entry of sheet.celldata ?? []) {
    if (entry.v) entries.push({ r: entry.r, c: entry.c, v: entry.v });
  }
  return entries;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

function assertLimits(sheets: KbWorkbookSheetInput[]): void {
  if (sheets.length < 1 || sheets.length > MAX_SHEETS) {
    throw new Error(
      `Spreadsheet must have between 1 and ${MAX_SHEETS} sheets (found ${sheets.length}).`,
    );
  }
  const totalCells = sheets.reduce((n, s) => n + s.cells.length, 0);
  if (totalCells > MAX_CELLS) {
    throw new Error(
      `Spreadsheet exceeds the ${MAX_CELLS.toLocaleString()}-cell limit (found ${totalCells.toLocaleString()}).`,
    );
  }
  const bytes = new TextEncoder().encode(JSON.stringify(sheets)).length;
  if (bytes > MAX_JSON_BYTES) {
    throw new Error(
      `Spreadsheet content exceeds the 5 MB size limit (${(bytes / 1024 / 1024).toFixed(1)} MB).`,
    );
  }
}

function toCell(r: number, c: number, raw: unknown): KbWorkbookCell {
  let t: KbWorkbookCellType;
  let v: KbWorkbookCell["v"];
  if (typeof raw === "number") { t = "number"; v = raw; }
  else if (typeof raw === "boolean") { t = "boolean"; v = raw; }
  else if (raw === null || raw === undefined) { t = "empty"; v = null; }
  else { t = "string"; v = String(raw); }
  return { r, c, t, v, m: v !== null ? String(v) : undefined };
}

function toFormulaCell(r: number, c: number, formula: string, result: unknown): KbWorkbookCell {
  const t: KbWorkbookCellType = typeof result === "number" ? "number" : "string";
  const v: KbWorkbookCell["v"] = result !== null && result !== undefined
    ? (typeof result === "number" || typeof result === "boolean" ? result : String(result))
    : null;
  return { r, c, t, v, f: formula.startsWith("=") ? formula : `=${formula}`, m: v !== null ? String(v) : undefined };
}

function colLetterToIndex(letters: string): number {
  let result = 0;
  for (let i = 0; i < letters.length; i++) {
    result = result * 26 + (letters.charCodeAt(i) - 64);
  }
  return result - 1;
}

async function readXlsx(file: File): Promise<KbWorkbookSheetInput[]> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const sheets: KbWorkbookSheetInput[] = [];

  wb.eachSheet((ws, sheetId) => {
    const cells: KbWorkbookCell[] = [];
    const columnlen: Record<string, number> = {};
    const merge: Record<string, { r: number; c: number; rs: number; cs: number }> = {};

    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const r = rowNumber - 1;
        const c = colNumber - 1;
        if (cell.formula) {
          cells.push(toFormulaCell(r, c, cell.formula, cell.result));
        } else if (cell.value !== null && cell.value !== undefined) {
          const bc = toCell(r, c, cell.value);
          const font = cell.style?.font;
          if (font?.bold || font?.italic) {
            bc.s = { ...(font.bold ? { bl: 1 } : {}), ...(font.italic ? { it: 1 } : {}) };
          }
          cells.push(bc);
        }
      });
    });

    ws.columns.forEach((col, idx) => {
      if (col.width !== undefined) columnlen[String(idx)] = Math.round(col.width * 7);
    });

    ws.model.merges.forEach((range) => {
      const match = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(range);
      if (!match) return;
      const c0 = colLetterToIndex(match[1]);
      const r0 = Number(match[2]) - 1;
      const c1 = colLetterToIndex(match[3]);
      const r1 = Number(match[4]) - 1;
      merge[`${r0}_${c0}`] = { r: r0, c: c0, rs: r1 - r0 + 1, cs: c1 - c0 + 1 };
    });

    const config: Record<string, unknown> = {};
    if (Object.keys(columnlen).length > 0) config.columnlen = columnlen;
    if (Object.keys(merge).length > 0) config.merge = merge;

    sheets.push({
      name: ws.name || `Sheet${sheetId}`,
      position: sheets.length,
      cells,
      config,
    });
  });

  if (sheets.length === 0) throw new Error("The file contains no sheets.");
  assertLimits(sheets);
  return sheets;
}

function hasBinaryContent(text: string): boolean {
  for (let i = 0; i < Math.min(text.length, 512); i++) {
    if (text.charCodeAt(i) === 0) return true;
  }
  return false;
}

async function readCsv(file: File): Promise<KbWorkbookSheetInput[]> {
  let text = await file.text();
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (hasBinaryContent(text)) {
    throw new Error("The CSV file contains binary content and cannot be imported as a spreadsheet.");
  }
  const Papa = (await import("papaparse")).default;
  const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
  const cells: KbWorkbookCell[] = [];
  result.data.forEach((row, r) => {
    row.forEach((raw, c) => {
      if (raw !== "" && raw !== null && raw !== undefined) {
        cells.push({ r, c, t: "string", v: raw, m: raw });
      }
    });
  });
  const sheets: KbWorkbookSheetInput[] = [
    { name: stripExtension(file.name) || "Sheet1", position: 0, cells, config: {} },
  ];
  assertLimits(sheets);
  return sheets;
}

export async function readSpreadsheetFile(
  file: File,
): Promise<{ title: string; workbook: KbWorkbookInput }> {
  const lower = file.name.toLowerCase();
  const isCsv = lower.endsWith(".csv") || file.type === "text/csv";
  const isXlsx =
    lower.endsWith(".xlsx") ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (!isCsv && !isXlsx) {
    throw new Error(
      "Unsupported file type. Only .xlsx and .csv files can be imported as spreadsheets.",
    );
  }
  const sheets = isCsv ? await readCsv(file) : await readXlsx(file);
  return { title: stripExtension(file.name), workbook: { sheets } };
}

function safeForCsv(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) return `'${value}`;
  return value;
}

function sheetToCsvString(sheet: FortuneSheet): string {
  const celldata = sheetEntries(sheet);
  let maxRow = 0;
  let maxCol = 0;
  const map = new Map<string, string>();
  for (const cell of celldata) {
    const cv = cell.v;
    const display = String(cv.m ?? cv.v ?? "");
    if (display) map.set(`${cell.r}_${cell.c}`, display);
    if (cell.r > maxRow) maxRow = cell.r;
    if (cell.c > maxCol) maxCol = cell.c;
  }
  const rows: string[] = [];
  for (let r = 0; r <= maxRow; r++) {
    const cols: string[] = [];
    for (let c = 0; c <= maxCol; c++) {
      const raw = map.get(`${r}_${c}`) ?? "";
      const safe = safeForCsv(raw);
      cols.push(
        safe.includes(",") || safe.includes('"') || safe.includes("\n")
          ? `"${safe.replace(/"/g, '""')}"`
          : safe,
      );
    }
    rows.push(cols.join(","));
  }
  return rows.join("\r\n");
}

async function sheetsToXlsxBuffer(sheets: FortuneSheet[], title: string): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.title = title;
  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name || "Sheet");
    const config = sheet.config ?? {};
    const columnlen = config.columnlen ?? {};
    for (const cell of sheetEntries(sheet)) {
      const cv = cell.v;
      const exCell = ws.getCell(cell.r + 1, cell.c + 1);
      if (cv.f) {
        exCell.value = { formula: cv.f.replace(/^=/, ""), result: cv.v };
      } else if (cv.v !== undefined && cv.v !== null) {
        exCell.value = cv.v;
      }
      const font: Partial<Font> = {};
      if (cv.bl) font.bold = true;
      if (cv.it) font.italic = true;
      if (Object.keys(font).length > 0) exCell.font = font;
    }
    for (const m of Object.values(config.merge ?? {})) {
      ws.mergeCells(m.r + 1, m.c + 1, m.r + m.rs, m.c + m.cs);
    }
    for (const [colIdx, width] of Object.entries(columnlen)) {
      ws.getColumn(Number(colIdx) + 1).width = width / 7;
    }
  }
  return wb.xlsx.writeBuffer();
}

export async function exportSpreadsheet(
  sheets: FortuneSheet[],
  title: string,
  format: "xlsx" | "csv",
): Promise<void> {
  const safeTitle = title.replace(/[/\\?%*:|"<>]/g, "_") || "spreadsheet";
  if (format === "csv") {
    const firstSheet = sheets[0];
    if (!firstSheet) throw new Error("No sheets to export.");
    triggerBlobDownload(
      new Blob([sheetToCsvString(firstSheet)], { type: "text/csv;charset=utf-8" }),
      `${safeTitle}.csv`,
    );
    return;
  }
  const buffer = await sheetsToXlsxBuffer(sheets, title);
  triggerBlobDownload(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${safeTitle}.xlsx`,
  );
}
