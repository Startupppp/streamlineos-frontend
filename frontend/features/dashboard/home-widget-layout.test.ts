import {
  compactHomeLayout,
  normalizeHomeWidgetSize,
  presentHomeLayout,
  HOME_WIDGET_DEFAULT_H,
  HOME_WIDGET_DEFAULT_W,
  HOME_WIDGET_MIN_H,
} from "./home-widget-layout";

function place(id: string, x: number, y: number, w: number, h = 4, moved = false) {
  return { i: id, x, y, w, h, moved };
}

describe("home widget layout", () => {
  it("packs the default widgets three across and leaves a short last row at its own width", () => {
    const layout = presentHomeLayout(["A", "B", "C", "D"], []);
    expect(layout.map((item) => [item.i, item.x, item.w, item.y])).toEqual([
      ["A", 0, HOME_WIDGET_DEFAULT_W, 0],
      ["B", 4, HOME_WIDGET_DEFAULT_W, 0],
      ["C", 8, HOME_WIDGET_DEFAULT_W, 0],
      ["D", 0, HOME_WIDGET_DEFAULT_W, HOME_WIDGET_DEFAULT_H],
    ]);
  });

  it("closes the hole when a widget is removed", () => {
    const layout = presentHomeLayout(["A", "C"], []);
    expect(layout.map((item) => [item.i, item.x])).toEqual([
      ["A", 0],
      ["C", 4],
    ]);
  });

  it("keeps a resized card's width and pulls the next card up to fill the row", () => {
    const layout = compactHomeLayout(
      [place("A", 0, 0, 9, 4, true), place("B", 1, 0, 4)],
      12,
    );
    expect(layout.find((item) => item.i === "A")).toMatchObject({ x: 0, w: 9, h: 4 });
    expect(layout.find((item) => item.i === "B")).toMatchObject({ x: 9, w: 3, h: 4 });
  });

  it("gives leftover columns to the other card when a resized card does not fill the row", () => {
    const layout = compactHomeLayout(
      [place("A", 0, 0, 6, 4, true), place("B", 1, 0, 4)],
      12,
    );
    expect(layout.find((item) => item.i === "A")?.w).toBe(6);
    expect(layout.find((item) => item.i === "B")).toMatchObject({ x: 6, w: 6 });
  });

  it("stretches the cards a resized card leaves behind, and matches that card's height", () => {
    const layout = compactHomeLayout(
      [
        place("A", 0, 0, 4, 4),
        place("B", 1, 0, 9, 6, true),
        place("C", 2, 0, 4, 4),
      ],
      12,
    );
    expect(layout.find((item) => item.i === "A")).toMatchObject({ w: 12, h: 4, y: 0 });
    expect(layout.find((item) => item.i === "B")).toMatchObject({ w: 9, h: 6 });
    expect(layout.find((item) => item.i === "C")).toMatchObject({ w: 3, h: 6 });
    expect(layout.find((item) => item.i === "C")?.y).toBe(layout.find((item) => item.i === "B")?.y);
  });

  it("leaves a default card on the next full row at its own width", () => {
    const layout = compactHomeLayout(
      [
        place("A", 0, 0, 5, 4, true),
        place("B", 1, 0, 4),
        place("C", 2, 0, 4),
        place("D", 3, 0, 4),
      ],
      12,
    );
    expect(layout.find((item) => item.i === "A")?.w).toBe(5);
    expect(layout.find((item) => item.i === "D")).toMatchObject({ x: 0, w: 4 });
    expect(layout.find((item) => item.i === "D")?.y).toBeGreaterThan(0);
  });

  it("stays put when the filled layout is packed again", () => {
    const once = compactHomeLayout(
      [place("A", 0, 0, 9, 5, true), place("B", 1, 0, 4, 4), place("C", 2, 0, 4, 4)],
      12,
    );
    const twice = compactHomeLayout(once, 12);
    expect(twice.map((item) => [item.i, item.x, item.y, item.w, item.h])).toEqual(
      once.map((item) => [item.i, item.x, item.y, item.w, item.h]),
    );
  });

  it("gives Business pulse a short row and lifts the old minimum height", () => {
    const fresh = presentHomeLayout(["Business pulse"], []);
    expect(fresh[0]).toMatchObject({ h: 2, minH: 2 });

    const stuck = presentHomeLayout(
      ["Business pulse"],
      [{ id: "Business pulse", w: 12, h: HOME_WIDGET_MIN_H }],
    );
    expect(stuck[0]?.h).toBe(2);
    expect(normalizeHomeWidgetSize({ id: "Business pulse", w: 12, h: 2 }).h).toBe(2);
  });

  it("keeps a Business pulse the user stretched, and a taller row in compact density", () => {
    const stretched = presentHomeLayout(
      ["Business pulse"],
      [{ id: "Business pulse", w: 12, h: 6 }],
    );
    expect(stretched[0]?.h).toBe(6);

    const compact = presentHomeLayout(
      ["Business pulse"],
      [{ id: "Business pulse", w: 12, h: 2 }],
      "compact",
    );
    expect(compact[0]?.h).toBe(3);
  });
});
