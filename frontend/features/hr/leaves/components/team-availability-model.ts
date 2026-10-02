import type { TeamAvailabilityRow } from "@/hooks/api/hr/leaves-team-availability-schema";

export interface MonthWindow {
  startDate: string;
  endDate: string;
  label: string;
  year: number;
  month: number;
}

export interface TeamAvailabilityDay {
  dayKey: string;
  dayOfMonth: number;
  isWeekend: boolean;
  names: string[];
}

export function monthWindow(year: number, month: number): MonthWindow {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return {
    startDate: `${prefix}-01`,
    endDate: `${prefix}-${String(last).padStart(2, "0")}`,
    label: new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(
      new Date(Date.UTC(year, month - 1, 1)),
    ),
    year,
    month,
  };
}

export function shiftMonth(window: MonthWindow, delta: number): MonthWindow {
  const zeroBased = window.month - 1 + delta;
  const year = window.year + Math.floor(zeroBased / 12);
  const month = ((zeroBased % 12) + 12) % 12;
  return monthWindow(year, month + 1);
}

export function buildAvailabilityDays(
  window: MonthWindow,
  rows: readonly TeamAvailabilityRow[],
): TeamAvailabilityDay[] {
  const last = Number(window.endDate.slice(8, 10));
  const days: TeamAvailabilityDay[] = [];

  for (let dayOfMonth = 1; dayOfMonth <= last; dayOfMonth += 1) {
    const dayKey = `${window.startDate.slice(0, 8)}${String(dayOfMonth).padStart(2, "0")}`;
    const weekday = new Date(`${dayKey}T00:00:00Z`).getUTCDay();
    const names = rows
      .filter(
        (row) =>
          row.startDate.slice(0, 10) <= dayKey && dayKey <= row.endDate.slice(0, 10),
      )
      .map((row) => row.userName ?? row.userId);
    days.push({
      dayKey,
      dayOfMonth,
      isWeekend: weekday === 0 || weekday === 6,
      names: Array.from(new Set(names)).sort(),
    });
  }

  return days;
}
