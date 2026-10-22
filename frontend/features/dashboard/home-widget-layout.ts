export const HOME_GRID_COLUMNS = 12;
export const HOME_WIDGET_MIN_W = 3;
export const HOME_WIDGET_MIN_H = 3;
export const HOME_WIDGET_MAX_H = 8;
export const HOME_WIDGET_DEFAULT_W = 4;
export const HOME_WIDGET_DEFAULT_H = 5;
export const HOME_WIDE_GRID_MIN_WIDTH = 768;

export interface HomeWidgetSize {
  id: string;
  w: number;
  h: number;
}

export interface HomeLayoutCommit {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HomeLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  moved?: boolean;
  minW: number;
  minH: number;
  maxW: number;
  maxH: number;
}

interface HomeLayoutSource {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  moved?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

type HomeLayoutDensity = "comfortable" | "compact";

const BUSINESS_PULSE_ID = "Business pulse";
const BUSINESS_PULSE_H = 2;

function minHeight(id: string): number {
  return id === BUSINESS_PULSE_ID ? BUSINESS_PULSE_H : HOME_WIDGET_MIN_H;
}

function defaultHeight(id: string, density: HomeLayoutDensity): number {
  if (id !== BUSINESS_PULSE_ID) return HOME_WIDGET_DEFAULT_H;
  return density === "compact" ? HOME_WIDGET_MIN_H : BUSINESS_PULSE_H;
}

function resolveHeight(
  id: string,
  saved: HomeWidgetSize | undefined,
  density: HomeLayoutDensity,
): number {
  const fallback = defaultHeight(id, density);
  const usesShortRow =
    id === BUSINESS_PULSE_ID &&
    (saved === undefined ||
      saved.h === BUSINESS_PULSE_H ||
      saved.h === HOME_WIDGET_MIN_H ||
      saved.h === HOME_WIDGET_DEFAULT_H);
  return usesShortRow ? fallback : (saved?.h ?? fallback);
}

export function normalizeHomeWidgetSize(size: HomeWidgetSize): HomeWidgetSize {
  return {
    id: size.id,
    w: clamp(size.w, HOME_WIDGET_MIN_W, HOME_GRID_COLUMNS),
    h: clamp(size.h, minHeight(size.id), HOME_WIDGET_MAX_H),
  };
}

function withBounds(source: HomeLayoutSource): HomeLayoutItem {
  const minH = minHeight(source.i);
  return {
    i: source.i,
    x: source.x,
    y: source.y,
    w: clamp(source.w, HOME_WIDGET_MIN_W, HOME_GRID_COLUMNS),
    h: clamp(source.h, minH, HOME_WIDGET_MAX_H),
    moved: source.moved,
    minW: HOME_WIDGET_MIN_W,
    minH,
    maxW: HOME_GRID_COLUMNS,
    maxH: HOME_WIDGET_MAX_H,
  };
}

function seedHomeLayout(
  orderedIds: readonly string[],
  placements: readonly HomeWidgetSize[],
  density: HomeLayoutDensity,
): HomeLayoutItem[] {
  const sizeById = new Map(placements.map((item) => [item.id, item]));
  return orderedIds.map((id, index) => {
    const saved = sizeById.get(id);
    return withBounds({
      i: id,
      x: index,
      y: 0,
      w: saved?.w ?? HOME_WIDGET_DEFAULT_W,
      h: resolveHeight(id, saved, density),
    });
  });
}

function stackLayout(ordered: readonly HomeLayoutSource[]): HomeLayoutItem[] {
  let y = 0;
  return ordered.map((source) => {
    const item = withBounds(source);
    const stacked = { ...item, x: 0, y, w: 1, minW: 1, maxW: 1 };
    y += stacked.h;
    return stacked;
  });
}

function packWide(ordered: readonly HomeLayoutSource[], forceAdjust = false): HomeLayoutItem[][] {
  const adjust = forceAdjust || ordered.some((item) => item.moved);
  const rows: HomeLayoutItem[][] = [];
  let row: HomeLayoutItem[] = [];
  let used = 0;

  function pushRow() {
    if (row.length === 0) return;
    rows.push(row);
    row = [];
    used = 0;
  }

  for (const source of ordered) {
    const item = withBounds(source);
    if (used > 0 && used + item.w > HOME_GRID_COLUMNS) {
      const spare = HOME_GRID_COLUMNS - used;
      if (adjust && !item.moved && spare >= HOME_WIDGET_MIN_W) {
        item.w = spare;
      } else {
        pushRow();
      }
    }
    row.push(item);
    used += item.w;
    if (used >= HOME_GRID_COLUMNS) pushRow();
  }
  pushRow();

  if (!adjust) return rows;

  let previousRowFull = false;
  for (const group of rows) {
    const spare = HOME_GRID_COLUMNS - group.reduce((sum, item) => sum + item.w, 0);
    const only = group[0];
    const naturalTail =
      group.length === 1 && previousRowFull && only?.w === HOME_WIDGET_DEFAULT_W;
    if (spare > 0 && group.length === 1 && only && !only.moved && !naturalTail) {
      only.w = HOME_GRID_COLUMNS;
    } else if (spare > 0 && group.length > 1) {
      const receiver = [...group].reverse().find((item) => !item.moved);
      if (receiver) receiver.w += spare;
    }
    const used = group.reduce((sum, item) => sum + item.w, 0);
    previousRowFull = used === HOME_GRID_COLUMNS;
  }

  return rows;
}

export function compactHomeLayout(
  layout: readonly HomeLayoutSource[],
  cols: number,
): HomeLayoutItem[] {
  const ordered = [...layout].sort((a, b) => a.y - b.y || a.x - b.x);
  if (cols !== HOME_GRID_COLUMNS) return stackLayout(ordered);

  const rows = packWide(ordered);
  let y = 0;
  const placed: HomeLayoutItem[] = [];
  for (const group of rows) {
    const active = group.find((item) => item.moved);
    let x = 0;
    let rowHeight = 0;
    for (const item of group) {
      if (active && !item.moved) item.h = active.h;
      item.x = x;
      item.y = y;
      x += item.w;
      rowHeight = Math.max(rowHeight, item.h);
    }
    y += rowHeight;
    placed.push(...group);
  }
  return placed;
}

export function presentHomeLayout(
  orderedIds: readonly string[],
  placements: readonly HomeWidgetSize[],
  density: HomeLayoutDensity = "comfortable",
): HomeLayoutItem[] {
  return compactHomeLayout(seedHomeLayout(orderedIds, placements, density), HOME_GRID_COLUMNS);
}

export function stackHomeLayout(
  orderedIds: readonly string[],
  placements: readonly HomeWidgetSize[],
  density: HomeLayoutDensity = "comfortable",
): HomeLayoutItem[] {
  return compactHomeLayout(seedHomeLayout(orderedIds, placements, density), 1);
}

export function markResizedItems(
  layout: readonly HomeLayoutSource[],
  previous: readonly { i: string; w: number; h: number }[] | null,
): HomeLayoutSource[] {
  if (!previous) return layout.map((item) => ({ ...item }));
  const prior = new Map(previous.map((item) => [item.i, item]));
  return layout.map((item) => {
    const saved = prior.get(item.i);
    const resized = saved !== undefined && (saved.w !== item.w || saved.h !== item.h);
    return { ...item, moved: Boolean(item.moved) || resized };
  });
}

export function homeLayoutChanged(
  orderedIds: readonly string[],
  placements: readonly HomeWidgetSize[],
  next: readonly HomeLayoutCommit[],
): boolean {
  if (next.length !== orderedIds.length) return true;
  const sizeById = new Map(placements.map((item) => [item.id, item]));
  return next.some((item, index) => {
    if (item.id !== orderedIds[index]) return true;
    const saved = sizeById.get(item.id);
    const w = saved?.w ?? HOME_WIDGET_DEFAULT_W;
    const h = saved?.h ?? HOME_WIDGET_DEFAULT_H;
    return item.w !== w || item.h !== h;
  });
}

export function reflowHomeLayout(
  orderedIds: readonly string[],
  placements: readonly HomeWidgetSize[],
  density: HomeLayoutDensity = "comfortable",
): HomeLayoutCommit[] {
  const seeded = seedHomeLayout(orderedIds, placements, density);
  const rows = packWide(seeded, true);
  let y = 0;
  const placed: HomeLayoutCommit[] = [];
  for (const group of rows) {
    let x = 0;
    let rowHeight = 0;
    for (const item of group) {
      placed.push({ id: item.i, x, y, w: item.w, h: item.h });
      x += item.w;
      rowHeight = Math.max(rowHeight, item.h);
    }
    y += rowHeight;
  }
  return placed;
}
