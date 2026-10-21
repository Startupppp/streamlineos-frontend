import type {
  KbWorkbookCell,
  KbWorkbookCellType,
  KbWorkbookOp,
  KbWorkbookSheet,
} from "@/hooks/api/kb/page-types";

type FortuneCellV = Record<string, unknown>;
type FortuneCellData = { r: number; c: number; v?: FortuneCellV };
type FortuneSheetLike = {
  id?: string;
  name?: string;
  order?: number;
  celldata?: FortuneCellData[];
  config?: Record<string, unknown>;
};

const MAX_OPS = 500;
const MAX_OP_CELLS = 50_000;

export function backendSheetsToFortuneSheets(sheets: KbWorkbookSheet[]): FortuneSheetLike[] {
  return sheets.map((sheet) => ({
    id: sheet.id,
    name: sheet.name,
    order: sheet.position,
    config: sheet.config,
    celldata: sheet.cells.map((cell) => ({
      r: cell.r,
      c: cell.c,
      v: {
        ...(cell.v !== null && cell.v !== undefined ? { v: cell.v } : {}),
        ...(cell.f ? { f: cell.f } : {}),
        ...(cell.m ? { m: cell.m } : {}),
        ...(cell.s ?? {}),
      } as FortuneCellV,
    })),
  }));
}

function inferCellType(raw: unknown): KbWorkbookCellType {
  if (raw === null || raw === undefined) return "empty";
  if (typeof raw === "number") return "number";
  if (typeof raw === "boolean") return "boolean";
  return "string";
}

function fortuneCellToBackend(cell: FortuneCellData): KbWorkbookCell {
  const cv = cell.v ?? {};
  const { v: rawV, f, m, ...rest } = cv;
  const style = Object.keys(rest).length > 0 ? (rest as Record<string, unknown>) : null;
  const t = rawV !== null && rawV !== undefined ? inferCellType(rawV) : (f ? "string" : "empty");
  const v: KbWorkbookCell["v"] =
    rawV === null || rawV === undefined
      ? null
      : typeof rawV === "number" || typeof rawV === "boolean"
        ? rawV
        : String(rawV);
  const result: KbWorkbookCell = { r: cell.r, c: cell.c, t, v };
  if (f) result.f = String(f);
  if (m) result.m = String(m);
  if (style) result.s = style;
  return result;
}

function cellKey(r: number, c: number): string {
  return `${r}_${c}`;
}

export function diffWorkbookOps(
  prevSheets: KbWorkbookSheet[],
  nextSheets: FortuneSheetLike[],
): KbWorkbookOp[] | "full-replace" {
  const ops: KbWorkbookOp[] = [];
  const prevMap = new Map(prevSheets.map((s) => [s.id, s]));
  const nextIds = new Set<string>();
  let totalCells = 0;

  nextSheets.forEach((next, idx) => {
    const id = next.id ?? crypto.randomUUID();
    nextIds.add(id);
    const prev = prevMap.get(id);

    if (!prev) {
      ops.push({ type: "addSheet", sheetId: id, name: next.name ?? "Sheet", position: idx });
      const cells = (next.celldata ?? []).map(fortuneCellToBackend);
      if (cells.length > 0) {
        totalCells += cells.length;
        ops.push({ type: "setCells", sheetId: id, cells });
      }
      const cfg = next.config ?? {};
      if (Object.keys(cfg).length > 0) {
        ops.push({ type: "setSheetConfig", sheetId: id, config: cfg });
      }
    } else {
      if (next.name && next.name !== prev.name) {
        ops.push({ type: "renameSheet", sheetId: id, name: next.name });
      }
      if (idx !== prev.position) {
        ops.push({ type: "moveSheet", sheetId: id, position: idx });
      }
      const nextCfg = next.config ?? {};
      if (JSON.stringify(nextCfg) !== JSON.stringify(prev.config)) {
        ops.push({ type: "setSheetConfig", sheetId: id, config: nextCfg });
      }
      const prevCellMap = new Map(prev.cells.map((c) => [cellKey(c.r, c.c), c]));
      const nextCellMap = new Map((next.celldata ?? []).map((c) => [cellKey(c.r, c.c), c]));
      const setCells: KbWorkbookCell[] = [];
      const clearCells: Array<{ r: number; c: number }> = [];
      nextCellMap.forEach((nc, key) => {
        const backend = fortuneCellToBackend(nc);
        const pc = prevCellMap.get(key);
        if (!pc || JSON.stringify(pc) !== JSON.stringify(backend)) {
          setCells.push(backend);
        }
      });
      prevCellMap.forEach((pc, key) => {
        if (!nextCellMap.has(key)) clearCells.push({ r: pc.r, c: pc.c });
      });
      if (setCells.length > 0) {
        totalCells += setCells.length;
        ops.push({ type: "setCells", sheetId: id, cells: setCells });
      }
      if (clearCells.length > 0) ops.push({ type: "clearCells", sheetId: id, cells: clearCells });
    }
  });

  prevSheets.forEach((s) => {
    if (!nextIds.has(s.id)) ops.push({ type: "deleteSheet", sheetId: s.id });
  });

  if (ops.length > MAX_OPS || totalCells > MAX_OP_CELLS) return "full-replace";
  return ops;
}

export function fortuneSheetsToInput(sheets: FortuneSheetLike[]): Array<{
  name: string;
  position: number;
  config: Record<string, unknown>;
  cells: KbWorkbookCell[];
}> {
  return sheets.map((s, idx) => ({
    name: s.name ?? "Sheet",
    position: s.order ?? idx,
    config: s.config ?? {},
    cells: (s.celldata ?? []).map(fortuneCellToBackend),
  }));
}
