import {
  PANEL_RENDER_PAGE_SIZE,
  resolvePanelVisibleCount,
  resolvePanelWindowStart,
} from "./panel-render-window";

describe("resolvePanelVisibleCount — the mounted row count is bounded", () => {
  it("mounts the whole collection while it fits inside one page", () => {
    expect(resolvePanelVisibleCount(10, 1)).toBe(10);
    expect(resolvePanelVisibleCount(PANEL_RENDER_PAGE_SIZE, 1)).toBe(PANEL_RENDER_PAGE_SIZE);
  });

  it("holds the rest back once the accumulated pages outgrow one window", () => {
    expect(resolvePanelVisibleCount(5_000, 1)).toBe(PANEL_RENDER_PAGE_SIZE);
  });

  it("widens by exactly one page per reveal", () => {
    expect(resolvePanelVisibleCount(5_000, 2) - resolvePanelVisibleCount(5_000, 1)).toBe(
      PANEL_RENDER_PAGE_SIZE,
    );
    expect(resolvePanelVisibleCount(5_000, 3) - resolvePanelVisibleCount(5_000, 2)).toBe(
      PANEL_RENDER_PAGE_SIZE,
    );
  });

  it("never overshoots the collection", () => {
    for (let pages = 1; pages <= 40; pages += 1)
      expect(resolvePanelVisibleCount(12, pages)).toBe(12);
  });

  it("treats an empty collection as empty rather than as one page", () => {
    expect(resolvePanelVisibleCount(0, 1)).toBe(0);
    expect(resolvePanelVisibleCount(0, 9)).toBe(0);
  });
});

describe("resolvePanelWindowStart — the tail window skips and repeats nothing", () => {
  it("keeps the newest page for an oldest-first list", () => {
    expect(resolvePanelWindowStart(5_000, 1)).toBe(5_000 - PANEL_RENDER_PAGE_SIZE);
  });

  it("reaches the very first row rather than running past it", () => {
    expect(resolvePanelWindowStart(30, 4)).toBe(0);
  });

  it("covers every index exactly once as the window widens", () => {
    const total = 200;
    const seen = new Set<number>();
    for (let pages = 1; pages <= Math.ceil(total / PANEL_RENDER_PAGE_SIZE); pages += 1) {
      const start = resolvePanelWindowStart(total, pages);
      for (let i = start; i < total; i += 1) seen.add(i);
    }
    expect(seen.size).toBe(total);
    expect(Math.min(...seen)).toBe(0);
    expect(Math.max(...seen)).toBe(total - 1);
  });
});
