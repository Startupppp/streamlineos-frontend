import { format, parseISO } from "date-fns";

/**
 * HRMS-E2E-013. A leave row on `/hr/approvals` has to say which days are being
 * asked for, in the width a queue row allows.
 *
 * Kept out of the component so it can be asserted directly: a single day must
 * not read as a range, and an unparseable date must not throw inside a list that
 * also holds good rows.
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = safeFormat(startDate);
  const end = safeFormat(endDate);
  if (start === null) return startDate;
  if (end === null || startDate === endDate) return start;
  return `${start} – ${end}`;
}

function safeFormat(value: string): string | null {
  try {
    const parsed = parseISO(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return format(parsed, "MMM d");
  } catch {
    return null;
  }
}
