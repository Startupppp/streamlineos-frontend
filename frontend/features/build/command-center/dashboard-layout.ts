import { verticalCompactor, type Layout, type LayoutItem } from "react-grid-layout";
import type { DashboardLayoutGetLayoutResponse } from "@/contracts/build-contracts.generated";
import { WIDGET_CATALOG } from "./widget-catalog";

export type WidgetSlot = DashboardLayoutGetLayoutResponse["config"]["widgets"][number];
export type WidgetType = WidgetSlot["type"];

export const GRID_COLUMNS = 12;
const MAX_WIDGET_ROWS = 8;

const RETIRED_WIDGET_TYPES = new Set<WidgetType>(["jump-to"]);

export const DEFAULT_WIDGETS: readonly WidgetSlot[] = [
  { type: "overview", position: { col: 0, row: 0, w: 12, h: 1 } },
  { type: "my-issues", position: { col: 0, row: 1, w: 7, h: 6 } },
  { type: "projects", position: { col: 7, row: 1, w: 5, h: 6 } },
  { type: "approvals", position: { col: 0, row: 7, w: 4, h: 5 } },
  { type: "agent-runs", position: { col: 4, row: 7, w: 4, h: 5 } },
  { type: "releases", position: { col: 8, row: 7, w: 4, h: 5 } },
  { type: "risks", position: { col: 0, row: 12, w: 6, h: 5 } },
  { type: "blockers", position: { col: 6, row: 12, w: 6, h: 5 } },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clampSlot(slot: WidgetSlot): WidgetSlot {
  const { minW, minH } = WIDGET_CATALOG[slot.type];
  const w = clamp(slot.position.w, minW, GRID_COLUMNS);
  const h = clamp(slot.position.h, minH, MAX_WIDGET_ROWS);
  return {
    ...slot,
    position: { col: clamp(slot.position.col, 0, GRID_COLUMNS - w), row: Math.max(slot.position.row, 0), w, h },
  };
}

function readingOrder(slots: readonly WidgetSlot[]): WidgetSlot[] {
  return [...slots].sort((a, b) => a.position.row - b.position.row || a.position.col - b.position.col);
}

export function toGridLayout(slots: readonly WidgetSlot[]): LayoutItem[] {
  return slots.map((slot) => ({
    i: slot.type,
    x: slot.position.col,
    y: slot.position.row,
    w: slot.position.w,
    h: slot.position.h,
    minW: WIDGET_CATALOG[slot.type].minW,
    minH: WIDGET_CATALOG[slot.type].minH,
    maxH: MAX_WIDGET_ROWS,
  }));
}

export function toStackedLayout(slots: readonly WidgetSlot[], overviewRows = 2): LayoutItem[] {
  let row = 0;
  return readingOrder(slots).map((slot) => {
    const height = slot.type === "overview" ? Math.max(slot.position.h, overviewRows) : slot.position.h;
    const item = { i: slot.type, x: 0, y: row, w: 1, h: height };
    row += height;
    return item;
  });
}

export function slotsFromLayout(layout: Layout, slots: readonly WidgetSlot[]): WidgetSlot[] {
  const byType = new Map<string, WidgetSlot>(slots.map((slot) => [slot.type, slot]));
  return layout.flatMap((item) => {
    const slot = byType.get(item.i);
    return slot ? [{ ...slot, position: { col: item.x, row: item.y, w: item.w, h: item.h } }] : [];
  });
}

function compactSlots(slots: readonly WidgetSlot[]): WidgetSlot[] {
  const clamped = slots.map(clampSlot);
  return readingOrder(slotsFromLayout(verticalCompactor.compact(toGridLayout(clamped), GRID_COLUMNS), clamped));
}

function arrangeSlots(slots: readonly WidgetSlot[]): WidgetSlot[] {
  let col = 0;
  let row = 0;
  let rowHeight = 0;
  const arranged = slots.map((candidate) => {
    const slot = clampSlot(candidate);
    if (col + slot.position.w > GRID_COLUMNS) {
      row += rowHeight;
      col = 0;
      rowHeight = 0;
    }
    const positioned = { ...slot, position: { ...slot.position, col, row } };
    col += slot.position.w;
    rowHeight = Math.max(rowHeight, slot.position.h);
    return positioned;
  });
  return compactSlots(arranged);
}

export function slotsFromStackedLayout(layout: Layout, slots: readonly WidgetSlot[]): WidgetSlot[] {
  const byType = new Map<string, WidgetSlot>(slots.map((slot) => [slot.type, slot]));
  const ordered = [...layout]
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .flatMap((item) => {
      const slot = byType.get(item.i);
      return slot ? [slot] : [];
    });
  return arrangeSlots(ordered);
}

export function normalizeSlots(
  slots: readonly WidgetSlot[],
  isAllowed: (type: WidgetType) => boolean,
): WidgetSlot[] {
  const seen = new Set<WidgetType>();
  const unique = slots.filter((slot) => {
    if (seen.has(slot.type) || RETIRED_WIDGET_TYPES.has(slot.type) || !isAllowed(slot.type)) return false;
    seen.add(slot.type);
    return true;
  });
  return compactSlots(unique);
}

export function withWidget(slots: readonly WidgetSlot[], type: WidgetType): WidgetSlot[] {
  if (RETIRED_WIDGET_TYPES.has(type) || slots.some((slot) => slot.type === type)) return [...slots];
  const bottom = slots.reduce((max, slot) => Math.max(max, slot.position.row + slot.position.h), 0);
  const { w, h } = WIDGET_CATALOG[type].size;
  return compactSlots([...slots, { type, position: { col: 0, row: bottom, w, h } }]);
}

export function withoutWidget(slots: readonly WidgetSlot[], type: WidgetType): WidgetSlot[] {
  return compactSlots(slots.filter((slot) => slot.type !== type));
}

export function withWidgetMoved(slots: readonly WidgetSlot[], type: WidgetType, offset: -1 | 1): WidgetSlot[] {
  const ordered = readingOrder(slots);
  const index = ordered.findIndex((slot) => slot.type === type);
  const target = index + offset;
  if (index < 0 || target < 0 || target >= ordered.length) return [...slots];
  const next = [...ordered];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return arrangeSlots(next);
}
