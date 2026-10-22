import type { ReportCadence, ReportSchedule } from "@/types/crm/reporting";

export const CADENCE_LABELS: Readonly<Record<ReportCadence, string>> = {
  daily: "Every day",
  weekly: "Every week",
  monthly: "Every month",
};

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const WEEKDAY_OPTIONS = WEEKDAYS.map((label, value) => ({ value, label }));

export const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: hour,
  label: `${String(hour).padStart(2, "0")}:00`,
}));

export function describeSchedule(schedule: ReportSchedule): string {
  const at = `${String(schedule.hourOfDay).padStart(2, "0")}:00`;
  if (schedule.cadence === "daily") return `Every day at ${at}`;
  if (schedule.cadence === "weekly")
    return `Every ${WEEKDAYS[schedule.dayOfWeek] ?? "week"} at ${at}`;
  return `Day ${schedule.dayOfMonth} of each month at ${at}`;
}
