

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

const SHORT_DATE_PARTS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

export function formatDateOnly(date: Date | string | null | undefined): string {
  if (!date) return "";
  if (typeof date === "string") {
    if (CALENDAR_DATE.test(date)) {
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
 * A `YYYY-MM-DD` from the API is a CALENDAR DATE, not an instant — `date` columns
 * (order date, expiry date, expected delivery) carry no time and no zone. Parsing
 * one with `new Date()` invents midnight UTC, and projecting that instant into the
 * reader's zone moves the day: an expiry of `2026-07-12` read as "11 Jul 2026" for
 * every reader west of UTC. A calendar date is therefore rendered in UTC, where the
 * invented instant and the intended day agree; a real instant still renders in the
 * reader's own zone, which is what a timestamp means to them.
 */
export function formatShortDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string" && CALENDAR_DATE.test(value)) {
    const calendar = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(calendar.getTime())) return "";
    return new Intl.DateTimeFormat("en-IN", { ...SHORT_DATE_PARTS, timeZone: "UTC" }).format(calendar);
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", SHORT_DATE_PARTS);
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

const EVENT_DATE_PARTS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

const EVENT_TIME_PARTS: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
};

export function readerTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * An IANA zone the browser does not know makes `Intl.DateTimeFormat` throw a
 * `RangeError`, which would take the whole detail panel down. The backend
 * contract only promises a string, so an unknown zone degrades to the reader's
 * rather than crashing the render.
 */
function resolveTimeZone(zone: string | null | undefined, fallback: string): string {
  if (!zone) return fallback;
  try {
    new Intl.DateTimeFormat("en-IN", { timeZone: zone });
    return zone;
  } catch {
    return fallback;
  }
}

/**
 * A calendar event's start and end are absolute instants; the zone it was
 * authored in is a separate fact. Rendering the instant in the reader's zone
 * and labelling it with the reader's zone is right about the moment and silent
 * about the intent — a 09:00 Asia/Kolkata standup reads as 03:30 Europe/London
 * with nothing saying it was not scheduled at 03:30. When the authored zone is
 * known and differs, the authored reading leads and the reader's follows.
 */
export function formatEventTimeRange(
  start: string | Date,
  end: string | Date,
  timezone?: string | null,
): string {
  const from = start instanceof Date ? start : new Date(start);
  const to = end instanceof Date ? end : new Date(end);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "";
  const reader = readerTimeZone();
  const zone = resolveTimeZone(timezone, reader);
  const date = new Intl.DateTimeFormat("en-IN", { ...EVENT_DATE_PARTS, timeZone: zone }).format(from);
  const fromTime = new Intl.DateTimeFormat("en-IN", { ...EVENT_TIME_PARTS, timeZone: zone }).format(from);
  const toTime = new Intl.DateTimeFormat("en-IN", { ...EVENT_TIME_PARTS, timeZone: zone }).format(to);
  const authored = `${date}, ${fromTime} – ${toTime} · ${zone}`;
  if (zone === reader) return authored;
  const readerTime = new Intl.DateTimeFormat("en-IN", { ...EVENT_TIME_PARTS, timeZone: reader }).format(from);
  return `${authored} (${readerTime} ${reader})`;
}

export function formatEventDate(value: string | Date, timezone?: string | null): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const zone = resolveTimeZone(timezone, readerTimeZone());
  return new Intl.DateTimeFormat("en-IN", { ...EVENT_DATE_PARTS, timeZone: zone }).format(date);
}
