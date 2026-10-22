import type { ComponentProps } from "react";
import type { Workbook } from "@fortune-sheet/react";
import { z } from "zod";
import type { KbWorkbookCell, KbWorkbookSheet } from "@/hooks/api/kb/kb-pages-schema";
import type { KbWorkbookOp, KbWorkbookSheetInput } from "@/hooks/api/kb/page-types";

export type FortuneSheet = ComponentProps<typeof Workbook>["data"][number];
type FortuneCell = NonNullable<NonNullable<FortuneSheet["celldata"]>[number]["v"]>;

const MAX_OPS = 500;
const MAX_REQUEST_CELLS = 50_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const optionalNumber = z.number().optional();
const optionalString = z.string().optional();

const cellStyleSchema = z.object({
  bl: optionalNumber,
  it: optionalNumber,
  ff: z.union([z.number(), z.string()]).optional(),
  fs: optionalNumber,
  fc: optionalString,
  ht: optionalNumber,
  vt: optionalNumber,
  tb: optionalString,
  cl: optionalNumber,
  un: optionalNumber,
  tr: optionalString,
  bg: optionalString,
  ct: z.object({ fa: optionalString, t: optionalString }).optional(),
  mc: z.object({ r: z.number(), c: z.number(), rs: optionalNumber, cs: optionalNumber }).optional(),
});

const indexRecord = z.record(z.string(), z.number()).optional();

const sheetConfigSchema = z.object({
  merge: z
    .record(z.string(), z.object({ r: z.number(), c: z.number(), rs: z.number(), cs: z.number() }))
    .optional(),
  rowlen: indexRecord,
  columnlen: indexRecord,
  rowhidden: indexRecord,
  colhidden: indexRecord,
  customHeight: indexRecord,
  customWidth: indexRecord,
  borderInfo: z.array(z.unknown()).optional(),
});

function parseStyle(source: unknown) {
  const parsed = cellStyleSchema.safeParse(source ?? {});
  return parsed.success ? parsed.data : {};
}

function parseConfig(source: unknown) {
  const parsed = sheetConfigSchema.safeParse(source ?? {});
  return parsed.success ? parsed.data : {};
}

function toFortuneCell(cell: KbWorkbookCell): FortuneCell {
  return {
    ...parseStyle(cell.s),
    ...(cell.v === null || cell.v === undefined ? {} : { v: cell.v }),
    ...(cell.m === undefined ? {} : { m: cell.m }),
    ...(cell.f === undefined ? {} : { f: cell.f }),
  };
}

export function toFortuneSheets(sheets: KbWorkbookSheet[]): FortuneSheet[] {
  return [...sheets]
    .sort((a, b) => a.position - b.position)
    .map((sheet) => ({
      id: sheet.id,
      name: sheet.name,
      order: sheet.position,
      config: parseConfig(sheet.config),
      celldata: sheet.cells.map((cell) => ({ r: cell.r, c: cell.c, v: toFortuneCell(cell) })),
    }));
}

function cellType(v: unknown): NonNullable<KbWorkbookCell["t"]> {
  if (typeof v === "number") return "number";
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "string") return "string";
  return "empty";
}

function fromFortuneCell(r: number, c: number, cell: FortuneCell | null | undefined): KbWorkbookCell | null {
  if (!cell) return null;
  const style = parseStyle(cell);
  const hasStyle = Object.keys(style).length > 0;
  const hasValue = cell.v !== undefined && cell.v !== null && cell.v !== "";
  if (!hasValue && !cell.f && !hasStyle) return null;
  const out: KbWorkbookCell = { r, c, t: hasValue ? cellType(cell.v) : "empty" };
  if (hasValue) out.v = cell.v;
  if (cell.f) out.f = cell.f;
  if (cell.m !== undefined && cell.m !== "") out.m = String(cell.m);
  if (hasStyle) out.s = style;
  return out;
}

function sheetCells(sheet: FortuneSheet): KbWorkbookCell[] {
  const cells: KbWorkbookCell[] = [];
  if (sheet.data) {
    sheet.data.forEach((row, r) => {
      row.forEach((cell, c) => {
        const converted = fromFortuneCell(r, c, cell);
        if (converted) cells.push(converted);
      });
    });
    return cells;
  }
  for (const entry of sheet.celldata ?? []) {
    const converted = fromFortuneCell(entry.r, entry.c, entry.v);
    if (converted) cells.push(converted);
  }
  return cells;
}

export function snapshotWorkbook(sheets: FortuneSheet[]): KbWorkbookSheet[] {
  return [...sheets]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((sheet, position) => {
      const cells = sheetCells(sheet);
      let rowCount = 0;
      let columnCount = 0;
      for (const cell of cells) {
        if (cell.r + 1 > rowCount) rowCount = cell.r + 1;
        if (cell.c + 1 > columnCount) columnCount = cell.c + 1;
      }
      return {
        id: sheet.id ?? "",
        name: sheet.name,
        position,
        rowCount,
        columnCount,
        config: parseConfig(sheet.config),
        cells,
      };
    });
}

function cellKey(cell: { r: number; c: number }): string {
  return `${cell.r}:${cell.c}`;
}

function diffCells(prev: KbWorkbookCell[], next: KbWorkbookCell[]) {
  const prevByKey = new Map(prev.map((cell) => [cellKey(cell), JSON.stringify(cell)]));
  const nextKeys = new Set<string>();
  const set: KbWorkbookCell[] = [];
  for (const cell of next) {
    const key = cellKey(cell);
    nextKeys.add(key);
    if (prevByKey.get(key) !== JSON.stringify(cell)) set.push(cell);
  }
  const clear = prev.filter((cell) => !nextKeys.has(cellKey(cell))).map((cell) => ({ r: cell.r, c: cell.c }));
  return { set, clear };
}

export function diffWorkbook(prev: KbWorkbookSheet[], next: KbWorkbookSheet[]): KbWorkbookOp[] | null {
  if (next.some((sheet) => !UUID_PATTERN.test(sheet.id))) return null;
  const prevById = new Map(prev.map((sheet) => [sheet.id, sheet]));
  const nextIds = new Set(next.map((sheet) => sheet.id));
  const ops: KbWorkbookOp[] = [];
  const cellOps: KbWorkbookOp[] = [];
  let cellCount = 0;

  for (const sheet of prev) {
    if (!nextIds.has(sheet.id)) ops.push({ op: "deleteSheet", sheetId: sheet.id });
  }
  const survivingNames = new Set(prev.filter((sheet) => nextIds.has(sheet.id)).map((sheet) => sheet.name));
  for (const sheet of next) {
    const before = prevById.get(sheet.id);
    if (!before) {
      ops.push({ op: "addSheet", sheetId: sheet.id, name: sheet.name, position: sheet.position });
      if (Object.keys(sheet.config).length > 0) ops.push({ op: "setSheetConfig", sheetId: sheet.id, config: sheet.config });
      if (sheet.cells.length > 0) {
        cellOps.push({ op: "setCells", sheetId: sheet.id, cells: sheet.cells });
        cellCount += sheet.cells.length;
      }
      continue;
    }
    if (before.name !== sheet.name) {
      if (survivingNames.has(sheet.name)) return null;
      ops.push({ op: "renameSheet", sheetId: sheet.id, name: sheet.name });
    }
    if (before.position !== sheet.position) ops.push({ op: "moveSheet", sheetId: sheet.id, position: sheet.position });
    if (JSON.stringify(before.config) !== JSON.stringify(sheet.config)) {
      ops.push({ op: "setSheetConfig", sheetId: sheet.id, config: sheet.config });
    }
    const { set, clear } = diffCells(before.cells, sheet.cells);
    if (clear.length > 0) cellOps.push({ op: "clearCells", sheetId: sheet.id, cells: clear });
    if (set.length > 0) cellOps.push({ op: "setCells", sheetId: sheet.id, cells: set });
    cellCount += set.length + clear.length;
  }
  const all = [...ops, ...cellOps];
  if (all.length > MAX_OPS || cellCount > MAX_REQUEST_CELLS) return null;
  return all;
}

export function toSheetInputs(sheets: KbWorkbookSheet[]): KbWorkbookSheetInput[] {
  return sheets.map((sheet) => ({
    ...(UUID_PATTERN.test(sheet.id) ? { id: sheet.id } : {}),
    name: sheet.name,
    position: sheet.position,
    config: sheet.config,
    cells: sheet.cells,
  }));
}
