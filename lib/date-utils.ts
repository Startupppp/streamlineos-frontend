// ── Date serialisation ───────────────────────────────────────

export function formatDateOnly(date: Date | string | null | undefined): string {
  if (!date) return "";
  if (typeof date === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    date = new Date(date);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatDateOnlyUTC(date: Date | string | null | undefined): string {
  if (!date) return "";

  if (typeof date === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    date = new Date(date);
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/** Alias for formatDateOnly — returns "YYYY-MM-DD". */
export const toISODateString = formatDateOnly;

export function fromISODateString(str: string): Date {
  const [year, month, day] = str.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function parseDateString(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Safe parser — returns null instead of Invalid Date. */
export function parseDate(value: unknown): Date | null {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function getTodayString(): string {
  return formatDateOnly(new Date());
}

export function compareDates(date1: Date | string, date2: Date | string): number {
  const d1 = formatDateOnly(date1);
  const d2 = formatDateOnly(date2);

  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
}

// ── Display formatting ───────────────────────────────────────

/**
 * Human-readable date for UI display. Replaces scattered toLocaleDateString calls.
 * Returns "12 Mar 2026" by default.
 */
export function formatDisplayDate(
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  locale: string = "en-IN",
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(locale, options ?? { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Returns "12 Mar 2026, 2:30 PM".
 */
export function formatDisplayDateTime(
  date: Date | string | null | undefined,
  locale: string = "en-IN",
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ── Comparisons ──────────────────────────────────────────────

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

export function isToday(date: Date | string): boolean {
  const d = toDate(date);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function isFuture(date: Date | string): boolean {
  return toDate(date).getTime() > Date.now();
}

export function isPast(date: Date | string): boolean {
  return toDate(date).getTime() < Date.now();
}

// ── Arithmetic ───────────────────────────────────────────────

export function daysBetween(date1: Date | string, date2: Date | string): number {
  const d1 = toDate(date1);
  const d2 = toDate(date2);
  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function daysSince(date: Date | string): number {
  return daysBetween(date, new Date());
}

export function addDays(date: Date | string, days: number): Date {
  const d = new Date(toDate(date));
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfDay(date: Date | string): Date {
  const d = new Date(toDate(date));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date | string): Date {
  const d = new Date(toDate(date));
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfMonth(date: Date | string): Date {
  const d = new Date(toDate(date));
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfMonth(date: Date | string): Date {
  const d = new Date(toDate(date));
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function workingDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}
