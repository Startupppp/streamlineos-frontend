import {
  GANTT_ROW_OVERSCAN,
  GANTT_DEFAULT_VIEWPORT_HEIGHT,
  resolveGanttRowBand,
} from "./gantt-row-window";

const HEADER = 40;
const ROW = 36;

describe("resolveGanttRowBand — the mounted row count follows the viewport", () => {
  it("mounts a viewport of rows for a 500-ticket board, not 500", () => {
    const band = resolveGanttRowBand(500, 0, 720, HEADER, ROW);
    expect(band.firstRow).toBe(0);
    expect(band.lastRow - band.firstRow).toBeLessThanOrEqual(
      Math.ceil(720 / ROW) + GANTT_ROW_OVERSCAN * 2 + 1,
    );
    expect(band.lastRow).toBeLessThan(500);
  });

  it("mounts every row when the board already fits the viewport", () => {
    const band = resolveGanttRowBand(6, 0, 720, HEADER, ROW);
    expect(band).toEqual({ firstRow: 0, lastRow: 6 });
  });

  it("falls back to a default viewport before the scroller has been measured", () => {
    const band = resolveGanttRowBand(500, 0, 0, HEADER, ROW);
    expect(band.lastRow).toBeGreaterThan(0);
    expect(band.lastRow).toBeLessThanOrEqual(
      Math.ceil(GANTT_DEFAULT_VIEWPORT_HEIGHT / ROW) + GANTT_ROW_OVERSCAN + 1,
    );
  });

  it("holds nothing for an empty board", () => {
    expect(resolveGanttRowBand(0, 0, 720, HEADER, ROW)).toEqual({ firstRow: 0, lastRow: 0 });
  });
});

describe("resolveGanttRowBand — scrolling reaches every row without a gap", () => {
  it("moves the band down as the timeline is scrolled", () => {
    const band = resolveGanttRowBand(500, HEADER + 200 * ROW, 720, HEADER, ROW);
    expect(band.firstRow).toBe(200 - GANTT_ROW_OVERSCAN);
    expect(band.lastRow).toBeGreaterThan(200);
  });

  it("covers every row exactly once across a full scroll, with no gap between bands", () => {
    const rowCount = 500;
    const viewport = 720;
    const seen = new Set<number>();
    let previousLast = 0;
    for (let top = 0; top <= HEADER + rowCount * ROW; top += viewport) {
      const band = resolveGanttRowBand(rowCount, top, viewport, HEADER, ROW);
      expect(band.firstRow).toBeLessThanOrEqual(previousLast);
      previousLast = band.lastRow;
      for (let i = band.firstRow; i < band.lastRow; i += 1) seen.add(i);
    }
    expect(seen.size).toBe(rowCount);
    expect(Math.min(...seen)).toBe(0);
    expect(Math.max(...seen)).toBe(rowCount - 1);
  });

  it("never runs past the last row", () => {
    const band = resolveGanttRowBand(500, 10 * HEADER + 5_000 * ROW, 720, HEADER, ROW);
    expect(band.lastRow).toBe(500);
    expect(band.firstRow).toBeLessThanOrEqual(500);
  });

  it("clamps a negative scroll offset to the first row", () => {
    expect(resolveGanttRowBand(500, -400, 720, HEADER, ROW).firstRow).toBe(0);
  });
});
