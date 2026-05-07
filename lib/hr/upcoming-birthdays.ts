import { differenceInCalendarDays, startOfDay } from "date-fns";

/**
 * Parse month (0–11) and day (1–31) from a stored DOB without UTC shifting
 * common with `new Date("YYYY-MM-DD")`.
 */
export function parseDobMonthDay(dateOfBirth: string): { month: number; day: number } {
  const head = dateOfBirth.slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(head);
  if (m) {
    return { month: parseInt(m[2], 10) - 1, day: parseInt(m[3], 10) };
  }
  const d = new Date(dateOfBirth);
  if (Number.isNaN(d.getTime())) {
    return { month: 0, day: 1 };
  }
  return { month: d.getMonth(), day: d.getDate() };
}

/**
 * Calendar days from `today` (start of local day) until the next occurrence of
 * the birthday (month/day), including 0 when the birthday is today.
 */
export function daysUntilNextBirthday(
  dateOfBirth: string | null | undefined,
  today: Date = new Date()
): number | null {
  if (!dateOfBirth) return null;
  const { month, day } = parseDobMonthDay(dateOfBirth);
  const t0 = startOfDay(today);
  let y = t0.getFullYear();
  let next = startOfDay(new Date(y, month, day));
  if (next < t0) {
    next = startOfDay(new Date(y + 1, month, day));
  }
  return differenceInCalendarDays(next, t0);
}

export function isBirthdayToday(
  dateOfBirth: string | null | undefined,
  today: Date = new Date()
): boolean {
  const d = daysUntilNextBirthday(dateOfBirth, today);
  return d === 0;
}

/** Upcoming in the next 7 calendar days, excluding today (1–7). */
export function isUpcomingBirthdaySoon(
  dateOfBirth: string | null | undefined,
  today: Date = new Date()
): boolean {
  const d = daysUntilNextBirthday(dateOfBirth, today);
  return d !== null && d >= 1 && d <= 7;
}
