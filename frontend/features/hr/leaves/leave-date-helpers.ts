export const isWeekend = (d: Date): boolean =>
  d.getDay() === 0 || d.getDay() === 6;

export function countWorkdays(startStr: string, endStr: string): number {
  const end = new Date(`${endStr}T00:00:00`);
  const current = new Date(`${startStr}T00:00:00`);
  let count = 0;
  while (current <= end) {
    if (!isWeekend(current)) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export function leaveStartFloor(
  joiningDate: Date | undefined,
  canBackdate: boolean,
  today: Date,
): Date {
  if (canBackdate) return joiningDate ?? new Date(today.getFullYear(), 0, 1);
  return joiningDate && joiningDate > today ? joiningDate : today;
}

const pad = (n: number): string => String(n).padStart(2, "0");

function toDay(value: string | Date | null | undefined): string | null {
  if (value instanceof Date)
    return Number.isNaN(value.getTime())
      ? null
      : `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  return typeof value === "string" && value.length >= 10
    ? value.slice(0, 10)
    : null;
}

interface DatedLeaveRequest {
  status: string | null;
  startDate: string | Date;
  endDate: string | Date;
  isHalfDay?: boolean;
}

function leaveDaysInYear(r: DatedLeaveRequest, year: number): number {
  const start = toDay(r.startDate);
  const end = toDay(r.endDate);
  if (!start || !end) return 0;
  const from = start < `${year}-01-01` ? `${year}-01-01` : start;
  const to = end > `${year}-12-31` ? `${year}-12-31` : end;
  if (from > to) return 0;
  const days = countWorkdays(from, to);
  return r.isHalfDay && days === 1 ? 0.5 : days;
}

export function approvedDaysInYear(
  requests: DatedLeaveRequest[],
  year: number = new Date().getFullYear(),
): number {
  const total = requests
    .filter((r) => r.status === "APPROVED")
    .reduce((sum, r) => sum + leaveDaysInYear(r, year), 0);
  return Math.round(total * 10) / 10;
}

export function pendingDaysByLeaveType(
  requests: Array<DatedLeaveRequest & { leaveTypeId?: number | null }>,
  year: number = new Date().getFullYear(),
): Map<number, number> {
  const byType = new Map<number, number>();
  for (const r of requests) {
    if (r.status !== "PENDING" || r.leaveTypeId == null) continue;
    const days = leaveDaysInYear(r, year);
    byType.set(r.leaveTypeId, Math.round(((byType.get(r.leaveTypeId) ?? 0) + days) * 10) / 10);
  }
  return byType;
}
