

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

export function subDays(date: Date | string, days: number): Date {
  return addDays(date, -days);
}

export function startOfWeek(date: Date | string): Date {
  const d = new Date(toDate(date));
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeek(date: Date | string): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

