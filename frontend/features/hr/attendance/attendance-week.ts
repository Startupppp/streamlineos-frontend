import { IST_TIME_ZONE } from "@/lib/hrms/payroll-cutoff";

export type PresenceState = "in" | "out" | "wfh" | "leave" | "unknown";

export interface WeekDay {
  dayKey: string;
  initial: string;
  presence: PresenceState;
  isToday: boolean;
}

export interface AttendanceDayRow {
  date: string;
  checkIn: Date | string | null;
  checkOut: Date | string | null;
  status: string | null;
}

const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

export function istDayKey(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: IST_TIME_ZONE,
  }).format(value);
}

export function presenceFor(row: AttendanceDayRow | undefined): PresenceState {
  if (!row) return "unknown";
  const status = (row.status ?? "").toUpperCase();
  if (status === "ON_LEAVE" || status === "LEAVE") return "leave";
  if (status === "WFH" || status === "WORK_FROM_HOME") return "wfh";
  if (row.checkOut) return "out";
  if (row.checkIn) return "in";
  return "unknown";
}

export function buildWeekStrip(
  rows: readonly AttendanceDayRow[],
  now: Date = new Date(),
): WeekDay[] {
  const today = istDayKey(now);
  const todayUtc = Date.parse(`${today}T00:00:00Z`);
  const weekday = new Date(todayUtc).getUTCDay();
  const mondayUtc = todayUtc - ((weekday === 0 ? 6 : weekday - 1) * 86_400_000);

  const byDay = new Map<string, AttendanceDayRow>();
  for (const row of rows) {
    const key = row.date?.slice(0, 10);
    if (key) byDay.set(key, row);
  }

  return Array.from({ length: 7 }, (_, offset) => {
    const stamp = new Date(mondayUtc + offset * 86_400_000);
    const dayKey = stamp.toISOString().slice(0, 10);
    return {
      dayKey,
      initial: DAY_INITIALS[stamp.getUTCDay()],
      presence: dayKey > today ? "unknown" : presenceFor(byDay.get(dayKey)),
      isToday: dayKey === today,
    };
  });
}
