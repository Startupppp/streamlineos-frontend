import { format, parseISO } from "date-fns";



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

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "d MMM yyyy, HH:mm:ss");
}

export function formatCalendarDate(value: string | null | undefined): string {
  if (!value) return "";
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return format(parsed, "d MMM yyyy");
}

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



export function formatRelativeTime(
  value: string | Date | null | undefined,
  now: Date = new Date(),
): string {
  if (!value) return "";
  const then = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(then.getTime())) return "";

  const seconds = Math.round((then.getTime() - now.getTime()) / 1000);
  const absolute = Math.abs(seconds);

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

function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const wall = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
  return wall - Math.floor(instant.getTime() / 1000) * 1000;
}

export function zonedWallClock(instant: Date, zone: string): Date {
  const wall = new Date(instant.getTime() + zoneOffsetMs(instant, zone));
  return new Date(
    wall.getUTCFullYear(),
    wall.getUTCMonth(),
    wall.getUTCDate(),
    wall.getUTCHours(),
    wall.getUTCMinutes(),
    wall.getUTCSeconds(),
    wall.getUTCMilliseconds(),
  );
}

export function fromZonedWallClock(wall: Date, zone: string): Date {
  const wallMs = Date.UTC(
    wall.getFullYear(),
    wall.getMonth(),
    wall.getDate(),
    wall.getHours(),
    wall.getMinutes(),
    wall.getSeconds(),
    wall.getMilliseconds(),
  );
  const guess = new Date(wallMs - zoneOffsetMs(new Date(wallMs), zone));
  return new Date(wallMs - zoneOffsetMs(guess, zone));
}

export function formatInZone(instant: Date, zone: string, pattern: string): string {
  return format(zonedWallClock(instant, zone), pattern);
}

export function endOfDayInTimeZone(now: Date, zone: string | null | undefined): Date {
  const timeZone = resolveTimeZone(zone, readerTimeZone());
  const today = new Date(now.getTime() + zoneOffsetMs(now, timeZone));
  const wallEnd = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59);
  const guess = new Date(wallEnd - zoneOffsetMs(now, timeZone));
  return new Date(wallEnd - zoneOffsetMs(guess, timeZone));
}

function canonicalizeTimeZone(zone: string): string {
  const normalized = zone.trim();
  if (
    normalized === "UTC" ||
    normalized === "GMT" ||
    normalized === "Etc/UTC" ||
    normalized === "Etc/GMT" ||
    normalized === "Etc/GMT+0" ||
    normalized === "Etc/GMT-0"
  ) {
    return "UTC";
  }
  if (normalized === "Asia/Calcutta") return "Asia/Kolkata";
  return normalized;
}

function displayTimeZone(zone: string): string {
  const canonical = canonicalizeTimeZone(zone);
  return canonical === "UTC" ? "UTC" : canonical;
}

function resolveTimeZone(zone: string | null | undefined, fallback: string): string {
  const fallbackCanonical = canonicalizeTimeZone(fallback);
  if (!zone) return fallbackCanonical;
  const canonical = canonicalizeTimeZone(zone);
  try {
    new Intl.DateTimeFormat("en-IN", { timeZone: canonical });
    return canonical;
  } catch {
    return fallbackCanonical;
  }
}

export function formatEventTimeRange(
  start: string | Date,
  end: string | Date,
  timezone?: string | null,
  readerZone?: string,
): string {
  const from = start instanceof Date ? start : new Date(start);
  const to = end instanceof Date ? end : new Date(end);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "";
  const readerRaw = readerZone ?? readerTimeZone();
  const reader = canonicalizeTimeZone(resolveTimeZone(readerRaw, readerRaw));
  const zone = canonicalizeTimeZone(resolveTimeZone(timezone, reader));
  const readerLabel = displayTimeZone(reader);
  const date = new Intl.DateTimeFormat("en-IN", { ...EVENT_DATE_PARTS, timeZone: reader }).format(from);
  const fromTime = new Intl.DateTimeFormat("en-IN", { ...EVENT_TIME_PARTS, timeZone: reader }).format(from);
  const toTime = new Intl.DateTimeFormat("en-IN", { ...EVENT_TIME_PARTS, timeZone: reader }).format(to);
  const primary = `${date}, ${fromTime} – ${toTime} · ${readerLabel}`;
  if (zone === reader) return primary;
  const sourceTime = new Intl.DateTimeFormat("en-IN", { ...EVENT_TIME_PARTS, timeZone: zone }).format(from);
  return `${primary} (${sourceTime} ${displayTimeZone(zone)})`;
}

export function formatEventDate(value: string | Date, timezone?: string | null): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const zone = resolveTimeZone(timezone, readerTimeZone());
  return new Intl.DateTimeFormat("en-IN", { ...EVENT_DATE_PARTS, timeZone: zone }).format(date);
}

export function formatEventDateRange(
  startDate: string,
  endDate: string,
  timezone?: string | null,
): string {
  if (startDate === endDate) return `${formatEventDate(startDate, timezone)} · All day`;
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    return `${formatEventDate(startDate, timezone)} · All day`;
  const fmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
  const startStr = fmt.format(start);
  const endFmt = new Intl.DateTimeFormat("en-IN", { ...EVENT_DATE_PARTS, timeZone: "UTC" });
  const endStr = endFmt.format(end);
  return `${startStr} – ${endStr} · All day`;
}

export function formatTimeInOrgTz(
  value: string | Date | null | undefined,
  orgTz: string | null,
): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const tz = resolveTimeZone(orgTz, readerTimeZone());
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  }).format(d);
}

export function formatDateTimeInOrgTz(
  value: string | Date | null | undefined,
  orgTz: string | null,
): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const tz = resolveTimeZone(orgTz, readerTimeZone());
  const datePart = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: tz,
  }).format(d);
  const timePart = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: tz,
  }).format(d);
  return `${datePart}, ${timePart}`;
}

export function todayInOrgTz(orgTz: string | null): string {
  const tz = resolveTimeZone(orgTz, readerTimeZone());
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: tz,
  }).format(new Date());
}

export function toIsoOnDateInOrgTz(
  dateStr: string,
  time: string,
  orgTz: string | null,
): string {
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const [hStr, mStr] = time.split(":");
  const wallMs = Date.UTC(
    Number(yearStr),
    Number(monthStr) - 1,
    Number(dayStr),
    Number(hStr),
    Number(mStr),
    0,
  );
  const tz = resolveTimeZone(orgTz, readerTimeZone());
  const guess = new Date(wallMs - zoneOffsetMs(new Date(wallMs), tz));
  return new Date(wallMs - zoneOffsetMs(guess, tz)).toISOString();
}

export function hoursInOrgTz(instant: Date, orgTz: string | null): number {
  const tz = resolveTimeZone(orgTz, readerTimeZone());
  const wall = new Date(instant.getTime() + zoneOffsetMs(instant, tz));
  return wall.getUTCHours();
}

export function formatClockInOrgTz(instant: Date, orgTz: string | null): string {
  if (!orgTz) return "";
  const tz = resolveTimeZone(orgTz, readerTimeZone());
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: tz,
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("hour")}:${get("minute")} ${get("dayPeriod")} - ${get("weekday")} ${get("day")}, ${get("month")} ${get("year")}`.toUpperCase();
}

export function datetimeLocalAfterDays(days: number, orgTz: string | null): string {
  const tz = resolveTimeZone(orgTz, readerTimeZone());
  const instant = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return new Date(instant.getTime() + zoneOffsetMs(instant, tz)).toISOString().slice(0, 16);
}

export function resolveOrgTimeZone(orgTz: string | null): string {
  return resolveTimeZone(orgTz, readerTimeZone());
}
