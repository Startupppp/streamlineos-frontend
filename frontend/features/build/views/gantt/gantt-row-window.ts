export const GANTT_ROW_OVERSCAN = 8;
export const GANTT_DEFAULT_VIEWPORT_HEIGHT = 600;

export interface GanttRowBand {
  firstRow: number;
  lastRow: number;
}

/**
 * The timeline draws one SVG `<g>` per dated ticket, each holding a hit target,
 * a rule, a label and a bar. A board autoloads up to 500 tickets, so the chart
 * mounted up to 2,000 SVG nodes to show the ~15 rows a viewport can hold.
 *
 * Rows are positioned absolutely by `computeBarGeometry`, so only the ones
 * inside the scrolled band need to exist: the SVG keeps its full height, the
 * scrollbar keeps its length, and every row still lands on the same pixel it
 * would have. `lastRow` is exclusive. The overscan on both sides means a row is
 * already mounted before it is scrolled into view.
 */
export function resolveGanttRowBand(
  rowCount: number,
  scrollTop: number,
  viewportHeight: number,
  headerHeight: number,
  rowHeight: number,
): GanttRowBand {
  if (rowCount <= 0 || rowHeight <= 0) return { firstRow: 0, lastRow: 0 };
  const height = viewportHeight > 0 ? viewportHeight : GANTT_DEFAULT_VIEWPORT_HEIGHT;
  const top = Math.max(0, scrollTop) - headerHeight;
  const firstRow = Math.min(
    rowCount,
    Math.max(0, Math.floor(top / rowHeight) - GANTT_ROW_OVERSCAN),
  );
  const lastRow = Math.min(
    rowCount,
    Math.ceil((top + height) / rowHeight) + GANTT_ROW_OVERSCAN,
  );
  return { firstRow, lastRow: Math.max(firstRow, lastRow) };
}
