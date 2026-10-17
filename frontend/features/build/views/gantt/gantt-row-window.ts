export const GANTT_ROW_OVERSCAN = 8;
export const GANTT_DEFAULT_VIEWPORT_HEIGHT = 600;

export interface GanttRowBand {
  firstRow: number;
  lastRow: number;
}


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
