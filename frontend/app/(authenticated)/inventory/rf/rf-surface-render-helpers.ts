import { screen } from "@testing-library/react";

export const VIEWPORT_WIDTH = 375;

export const TABLE_ROLES = ["table", "grid", "row", "columnheader", "rowheader", "gridcell"] as const;

export const FIXED_WIDTH = /\b(?:min-)?w-\[(\d+)px\]/g;

export function expectNoTable(container: HTMLElement): void {
  expect(container.querySelectorAll("table")).toHaveLength(0);
  for (const role of TABLE_ROLES) {
    expect(screen.queryAllByRole(role)).toEqual([]);
  }
}

export function expectNothingWiderThanTheDevice(container: HTMLElement): void {
  const tooWide: string[] = [];
  for (const el of Array.from(container.querySelectorAll("[class]"))) {
    const classes = el.getAttribute("class") ?? "";
    for (const match of classes.matchAll(FIXED_WIDTH)) {
      if (Number(match[1]) > VIEWPORT_WIDTH) tooWide.push(match[0]);
    }
    if (/overflow-x-(auto|scroll)/.test(classes)) tooWide.push("overflow-x");
  }
  expect(tooWide).toEqual([]);
}

export const MIXED_QUEUE = [
  {
    kind: "PICK",
    id: 1,
    reference: "PICK-0001",
    summary: "3 lines to pick",
    warehouseId: 1,
    href: "/inventory/rf/pick/1",
  },
  {
    kind: "PUTAWAY",
    id: 2,
    reference: "PUT-0002",
    summary: "1 pallet to put away",
    warehouseId: 1,
    href: "/inventory/rf/putaway/2",
  },
  {
    kind: "COUNT",
    id: 3,
    reference: "CNT-0003",
    summary: "12 bins to count",
    warehouseId: null,
    href: "/inventory/cycle-counts?count=3",
  },
];
