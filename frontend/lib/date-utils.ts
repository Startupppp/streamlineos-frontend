import { format } from "date-fns";



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
export function getTodayString(): string {
  return formatDateOnly(new Date());
}

/**
 * Date and time, for a log where "when exactly" is the question being asked.
 *
 * `formatShortDate` deliberately drops the time, which is right for a due date
 * and wrong for an audit trail: two events a minute apart would render
 * identically and the order would look arbitrary.
 */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "d MMM yyyy, HH:mm:ss");
}

export function formatShortDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}



/**
 * "2 hours ago", for a feed that is read as a stream of recent events.
 *
 * `Intl.RelativeTimeFormat` rather than a hand-rolled ladder: it is locale-aware
 * for free and gets the plural rules right, which a `n === 1 ? "" : "s"` does
 * not once the locale is not English.
 *
 * Beyond a week it falls back to an absolute date. "43 days ago" is arithmetic
 * the reader has to undo; a date is the thing they were going to work out
 * anyway. Always pair it with the exact timestamp in a `title` or `dateTime`,
 * because an audit trail has to be able to answer "when exactly".
 */
export function formatRelativeTime(
  value: string | Date | null | undefined,
  now: Date = new Date(),
): string {
  if (!value) return "";
  const then = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(then.getTime())) return "";

  const seconds = Math.round((then.getTime() - now.getTime()) / 1000);
  const absolute = Math.abs(seconds);

  // Under a minute reads better as words than as "in 0 seconds".
  if (absolute < 45) return "just now";

  const formatter = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" });
  const divisions: ReadonlyArray<[number, Intl.RelativeTimeFormatUnit]> = [
    [60, "second"],
    [3600, "minute"],
    [86400, "hour"],
    [604800, "day"],
  ];

  let previous = 1;
  for (const [limit, unit] of divisions) {
    if (absolute < limit) return formatter.format(Math.round(seconds / previous), unit);
    previous = limit;
  }

  return formatShortDate(then);
}
