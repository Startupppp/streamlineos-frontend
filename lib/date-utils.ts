/**
 * Formats a Date object to "YYYY-MM-DD" string without timezone conversion.
 * This extracts the local date components directly from the Date object.
 *
 * @param date - The Date object to format
 * @returns A string in "YYYY-MM-DD" format
 */
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

/**
 * Formats a Date object to "YYYY-MM-DD" string using UTC components.
 * Use this when you specifically want the UTC date.
 *
 * @param date - The Date object to format
 * @returns A string in "YYYY-MM-DD" format (UTC)
 */
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

/**
 * Parses a "YYYY-MM-DD" string to a Date object at midnight local time.
 * This avoids the timezone shift that can happen with new Date("2024-01-07").
 *
 * @param dateString - A string in "YYYY-MM-DD" format
 * @returns A Date object representing midnight local time on that date
 */
export function parseDateString(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Gets today's date as a "YYYY-MM-DD" string in local timezone.
 *
 * @returns Today's date as "YYYY-MM-DD"
 */
export function getTodayString(): string {
  return formatDateOnly(new Date());
}

/**
 * Compares two dates ignoring time components.
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareDates(date1: Date | string, date2: Date | string): number {
  const d1 = formatDateOnly(date1);
  const d2 = formatDateOnly(date2);

  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
}
