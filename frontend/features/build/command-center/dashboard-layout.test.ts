import {
  DEFAULT_WIDGETS,
  normalizeSlots,
  slotsFromStackedLayout,
  toGridLayout,
  toStackedLayout,
  withWidget,
  withWidgetMoved,
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
    expect(slots.find((slot) => slot.type === "my-issues")?.position.row).toBe(0);
  });

  it("drops the retired jump-to widget from an older saved layout", () => {
    const slots = normalizeSlots(
      [{ type: "jump-to", position: { col: 0, row: 0, w: 12, h: 2 } }, ...DEFAULT_WIDGETS],
      allowAll,
    );
    expect(slots.some((slot) => slot.type === "jump-to")).toBe(false);
  });

  it("adds a widget once even when it is added twice", () => {
    const once = withWidget(normalizeSlots([], allowAll), "releases");
    expect(withWidget(once, "releases")).toHaveLength(1);
  });

  it("stacks every widget in one column in reading order on narrow screens", () => {
    const stacked = toStackedLayout(normalizeSlots(DEFAULT_WIDGETS, allowAll));
    expect(stacked.every((item) => item.x === 0 && item.w === 1)).toBe(true);
    expect(stacked.map((item) => item.i).slice(0, 3)).toEqual(["overview", "my-issues", "projects"]);
    expect(stacked.find((item) => item.i === "overview")?.h).toBe(2);
  });

  it("reserves a third overview row on compact phones", () => {
    const stacked = toStackedLayout(normalizeSlots(DEFAULT_WIDGETS, allowAll), 3);
    expect(stacked.find((item) => item.i === "overview")?.h).toBe(3);
    expect(stacked.find((item) => item.i === "my-issues")?.y).toBe(3);
  });

  it("applies a narrow-screen reorder without replacing desktop sizes", () => {
    const slots: WidgetSlot[] = [
      { type: "my-issues", position: { col: 0, row: 0, w: 7, h: 6 } },
      { type: "projects", position: { col: 7, row: 0, w: 5, h: 6 } },
    ];
    const reordered = slotsFromStackedLayout(
      [
        { i: "projects", x: 0, y: 0, w: 1, h: 6 },
        { i: "my-issues", x: 0, y: 6, w: 1, h: 6 },
      ],
      slots,
    );
    expect(reordered.map((slot) => slot.type)).toEqual(["projects", "my-issues"]);
    expect(reordered.map((slot) => slot.position.w)).toEqual([5, 7]);
  });

  it("moves a widget by reading order and keeps boundary moves unchanged", () => {
    const slots = normalizeSlots(DEFAULT_WIDGETS, allowAll);
    expect(withWidgetMoved(slots, "overview", 1).slice(0, 2).map((slot) => slot.type)).toEqual([
      "my-issues",
      "overview",
    ]);
    expect(withWidgetMoved(slots, "overview", -1)).toEqual(slots);
  });

  it("passes each widget's minimum size to the grid so resizing cannot crush a panel", () => {
    const [item] = toGridLayout([{ type: "my-issues", position: { col: 0, row: 0, w: 6, h: 6 } }]);
    expect(item).toMatchObject({ i: "my-issues", minW: 4, minH: 4, maxH: 8 });
  });
});
