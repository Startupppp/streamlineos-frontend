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

const pad = (n: number): string => String(n).padStart(2, "0");

/** yyyy-MM-dd in local time — never via toISOString, which shifts the day. */
function toDay(value: string | Date | null | undefined): string | null {
  if (value instanceof Date)
    return Number.isNaN(value.getTime())
      ? null
      : `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  return typeof value === "string" && value.length >= 10
    ? value.slice(0, 10)
    : null;
}

/**
 * V-045. Approved leave *days* taken in `year` — workdays, halved for a
 * half-day request, clamped to the year so a request spanning new year is not
 * counted twice. The card used to show a count of approved *requests*, which
 * is not what "Approved (YTD)" means to anyone reading it.
 */
export function approvedDaysInYear(
  requests: Array<{
    status: string | null;
    startDate: string | Date;
    endDate: string | Date;
    isHalfDay?: boolean;
  }>,
  year: number = new Date().getFullYear(),
): number {
  const total = requests
    .filter((r) => r.status === "APPROVED")
    .reduce((sum, r) => {
      const start = toDay(r.startDate);
      const end = toDay(r.endDate);
      if (!start || !end) return sum;
      const from = start < `${year}-01-01` ? `${year}-01-01` : start;
      const to = end > `${year}-12-31` ? `${year}-12-31` : end;
      if (from > to) return sum;
      const days = countWorkdays(from, to);
      return sum + (r.isHalfDay && days === 1 ? 0.5 : days);
    }, 0);
  return Math.round(total * 10) / 10;
}
