export interface BarGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

const MS_PER_DAY = 86_400_000;

export function computeBarGeometry(
  startDate: string | null | undefined,
  dueDate: string | null | undefined,
  rowIdx: number,
  startOfWeek: Date,
  numDays: number,
  dayWidth: number,
  labelWidth: number,
  rowHeight: number
): BarGeometry {
  const barY = 40 + rowIdx * rowHeight;
  const start = startDate ? new Date(startDate) : dueDate ? new Date(dueDate) : null;
  const end = dueDate ? new Date(dueDate) : start;
  if (!start || !end) return { x: 0, y: barY, width: 0, height: rowHeight, visible: false };
  const startDay = Math.max(0, Math.floor((start.getTime() - startOfWeek.getTime()) / MS_PER_DAY));
  const endDay = Math.min(numDays - 1, Math.floor((end.getTime() - startOfWeek.getTime()) / MS_PER_DAY));
  if (startDay > numDays - 1 || endDay < 0) return { x: 0, y: barY, width: 0, height: rowHeight, visible: false };
  return {
    x: labelWidth + startDay * dayWidth + 2,
    y: barY,
    width: Math.max(dayWidth - 4, (endDay - startDay + 1) * dayWidth - 4),
    height: rowHeight,
    visible: true,
  };
}
