import type { PayrollCutoff } from "@/lib/hrms/payroll-cutoff";
import { IST_TIME_ZONE } from "@/lib/hrms/payroll-cutoff";

export type DateRangePresetId = "today" | "week" | "month" | "payCycle" | "custom";

export interface DateRange {
  from: string;
  to: string;
}

export interface DateRangePreset {
  id: DateRangePresetId;
  label: string;
  range: DateRange | null;
}

function istDayKey(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: IST_TIME_ZONE,
  }).format(value);
}

function shiftDays(dayKey: string, days: number): string {
  const base = Date.parse(`${dayKey}T00:00:00Z`);
  return new Date(base + days * 86_400_000).toISOString().slice(0, 10);
}

export function istWeekRange(now: Date = new Date()): DateRange {
  const today = istDayKey(now);
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const from = shiftDays(today, mondayOffset);
  return { from, to: shiftDays(from, 6) };
}

export function istMonthRange(now: Date = new Date()): DateRange {
  const today = istDayKey(now);
  const [year, month] = today.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: `${today.slice(0, 7)}-01`,
    to: `${today.slice(0, 7)}-${String(last).padStart(2, "0")}`,
  };
}

export function payCycleRange(cutoff: PayrollCutoff | null): DateRange | null {
  if (!cutoff) return null;
  const end = cutoff.date.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) return null;
  return { from: `${end.slice(0, 7)}-01`, to: end };
}

export function attendanceDatePresets(
  cutoff: PayrollCutoff | null,
  now: Date = new Date(),
): DateRangePreset[] {
  const today = istDayKey(now);
  const presets: DateRangePreset[] = [
    { id: "today", label: "Today", range: { from: today, to: today } },
    { id: "week", label: "This week", range: istWeekRange(now) },
    { id: "month", label: "This month", range: istMonthRange(now) },
  ];

  const cycle = payCycleRange(cutoff);
  if (cycle) {
    presets.push({ id: "payCycle", label: "Pay cycle", range: cycle });
  }

  presets.push({ id: "custom", label: "Custom", range: null });
  return presets;
}
