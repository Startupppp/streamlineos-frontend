import {
  DEFAULT_WIDGETS,
  normalizeSlots,
  toGridLayout,
  toStackedLayout,
  withWidget,
  withWidgetMoved,
  withWidgetWidth,
  withoutWidget,
  type WidgetSlot,
} from "./dashboard-layout";

const allowAll = () => true;

function overlaps(a: WidgetSlot, b: WidgetSlot): boolean {
  return (
    a.position.col < b.position.col + b.position.w &&
    b.position.col < a.position.col + a.position.w &&
    a.position.row < b.position.row + b.position.h &&
    b.position.row < a.position.row + a.position.h
  );
}

function hasOverlap(slots: readonly WidgetSlot[]): boolean {
  return slots.some((a, i) => slots.slice(i + 1).some((b) => overlaps(a, b)));
}

describe("dashboard layout model", () => {
  it("lays out the default arrangement without overlaps inside twelve columns", () => {
    const slots = normalizeSlots(DEFAULT_WIDGETS, allowAll);
    expect(hasOverlap(slots)).toBe(false);
    expect(slots.every((slot) => slot.position.col + slot.position.w <= 12)).toBe(true);
  });

  it("separates stored widgets that overlap so a corrupted layout still renders cleanly", () => {
    const slots = normalizeSlots(
      [
        { type: "projects", position: { col: 0, row: 0, w: 6, h: 5 } },
        { type: "risks", position: { col: 2, row: 1, w: 6, h: 5 } },
      ],
      allowAll,
    );
    expect(hasOverlap(slots)).toBe(false);
  });

  it("clamps an out-of-range width and column back into the grid and up to the widget's minimum", () => {
    const [slot] = normalizeSlots([{ type: "my-issues", position: { col: 11, row: 0, w: 1, h: 1 } }], allowAll);
    expect(slot?.position).toEqual({ col: 8, row: 0, w: 4, h: 4 });
  });

  it("pulls widgets up into the space a removed widget leaves", () => {
    const slots = withoutWidget(normalizeSlots(DEFAULT_WIDGETS, allowAll), "overview");
    expect(slots.find((slot) => slot.type === "jump-to")?.position.row).toBe(0);
  });

  it("adds a widget once even when it is added twice", () => {
    const once = withWidget(normalizeSlots([], allowAll), "releases");
    expect(withWidget(once, "releases")).toHaveLength(1);
  });

  it("moves a widget later by swapping it with the next one in reading order", () => {
    const slots = normalizeSlots(DEFAULT_WIDGETS, allowAll);
    const moved = withWidgetMoved(slots, "overview", 1);
    expect(moved.map((slot) => slot.type).slice(0, 2)).toEqual(["jump-to", "overview"]);
    expect(hasOverlap(moved)).toBe(false);
  });

  it("leaves the first widget in place when asked to move earlier", () => {
    const slots = normalizeSlots(DEFAULT_WIDGETS, allowAll);
    expect(withWidgetMoved(slots, "overview", -1)).toEqual(slots);
  });

  it("widens a widget and pushes its neighbour below instead of overlapping it", () => {
    const slots = withWidgetWidth(normalizeSlots(DEFAULT_WIDGETS, allowAll), "my-issues", 12);
    expect(slots.find((slot) => slot.type === "my-issues")?.position.w).toBe(12);
    expect(hasOverlap(slots)).toBe(false);
  });

  it("stacks every widget in one column in reading order on narrow screens", () => {
    const stacked = toStackedLayout(normalizeSlots(DEFAULT_WIDGETS, allowAll));
    expect(stacked.every((item) => item.x === 0 && item.w === 1)).toBe(true);
    expect(stacked.map((item) => item.i).slice(0, 3)).toEqual(["overview", "jump-to", "my-issues"]);
  });

  it("passes each widget's minimum size to the grid so resizing cannot crush a panel", () => {
    const [item] = toGridLayout([{ type: "my-issues", position: { col: 0, row: 0, w: 6, h: 6 } }]);
    expect(item).toMatchObject({ i: "my-issues", minW: 4, minH: 4, maxH: 8 });
  });
});
