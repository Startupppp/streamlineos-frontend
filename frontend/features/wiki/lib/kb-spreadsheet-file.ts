import type { KbWorkbookCell, KbWorkbookCellType, KbWorkbookInput, KbWorkbookSheetInput } from "@/hooks/api/kb/page-types";

export const KB_SPREADSHEET_ACCEPT =
  ".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const MAX_SHEETS = 50;
const MAX_CELLS = 200_000;
const MAX_JSON_BYTES = 5 * 1024 * 1024;

type SheetRecord = Record<string, unknown>;
type FortuneCellV = Record<string, unknown>;
type FortuneCellData = { r: number; c: number; v?: FortuneCellV };

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
  return { r, c, t, v, f: formula, m: v !== null ? String(v) : undefined };
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
        if (cell.type === 6) {
          const sv = cell.value as { sharedFormula?: string; formula?: string; result?: unknown };
          const f = sv.formula ?? sv.sharedFormula ?? "";
          if (f) cells.push(toFormulaCell(r, c, f, sv.result));
        } else if (cell.type === 4 && typeof cell.value === "object" && cell.value !== null && "formula" in cell.value) {
          const fv = cell.value as { formula: string; result?: unknown };
          cells.push(toFormulaCell(r, c, fv.formula, fv.result));
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

    ws.mergeCells.forEach?.((range: string) => {
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

function sheetToCsvString(sheet: SheetRecord): string {
  const celldata = Array.isArray(sheet.celldata)
    ? (sheet.celldata as FortuneCellData[])
    : [];
  let maxRow = 0;
  let maxCol = 0;
  const map = new Map<string, string>();
  for (const cell of celldata) {
    const cv = cell.v ?? {};
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

async function sheetsToXlsxBuffer(sheets: SheetRecord[], title: string): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.title = title;
  for (const sheet of sheets) {
    const ws = wb.addWorksheet(typeof sheet.name === "string" ? sheet.name : "Sheet");
    const celldata = Array.isArray(sheet.celldata) ? (sheet.celldata as FortuneCellData[]) : [];
    const config = (sheet.config ?? {}) as Record<string, unknown>;
    const columnlen = (config.columnlen ?? {}) as Record<string, number>;
    for (const cell of celldata) {
      const cv = cell.v ?? {};
      const exCell = ws.getCell(cell.r + 1, cell.c + 1);
      if (cv.f) {
        exCell.value = { formula: String(cv.f), result: cv.v } as ExcelJS.CellFormulaValue;
      } else if (cv.v !== undefined && cv.v !== null) {
        exCell.value = cv.v as ExcelJS.CellValue;
      }
      const font: Partial<ExcelJS.Font> = {};
      if (cv.bl) font.bold = true;
      if (cv.it) font.italic = true;
      if (Object.keys(font).length > 0) exCell.font = font;
    }
    const merge = (config.merge ?? {}) as Record<string, { r: number; c: number; rs: number; cs: number }>;
    for (const m of Object.values(merge)) {
      ws.mergeCells(m.r + 1, m.c + 1, m.r + m.rs, m.c + m.cs);
    }
    for (const [colIdx, width] of Object.entries(columnlen)) {
      ws.getColumn(Number(colIdx) + 1).width = width / 7;
    }
  }
  return wb.xlsx.writeBuffer();
}

export async function exportSpreadsheet(
  sheets: SheetRecord[],
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
