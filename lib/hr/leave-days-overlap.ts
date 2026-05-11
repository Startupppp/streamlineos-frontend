import { calendarDaysInMonth } from "@/lib/hr/payroll-calculations";

/** Count calendar days of approved leave overlapping `monthYyyyMm` (half-day = 0.5 when single day). */
export function leaveDaysOverlappingMonth(
  startDate: string,
  endDate: string,
  monthYyyyMm: string,
  isHalfDay: boolean
): number {
  const last = calendarDaysInMonth(monthYyyyMm);
  const monthStartStr = `${monthYyyyMm}-01`;
  const monthEndStr = `${monthYyyyMm}-${String(last).padStart(2, "0")}`;
  const s = startDate.slice(0, 10);
  const e = endDate.slice(0, 10);
  const lo = s > monthStartStr ? s : monthStartStr;
  const hi = e < monthEndStr ? e : monthEndStr;
  if (lo > hi) return 0;
  if (isHalfDay && lo === hi) return 0.5;
  const d0 = new Date(`${lo}T12:00:00.000Z`);
  const d1 = new Date(`${hi}T12:00:00.000Z`);
  return (d1.getTime() - d0.getTime()) / 86_400_000 + 1;
}
