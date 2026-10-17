/** The 15th of the current month is already past after that day, so start next month. */
export function defaultPayrollStartMonth(today = new Date()): string {
  const offset = today.getDate() > 15 ? 1 : 0;
  const start = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const month = String(start.getMonth() + 1).padStart(2, "0");
  return `${start.getFullYear()}-${month}`;
}

/** Move a YYYY-MM-DD that is already in the past to the next future occurrence of that day. */
export function shiftPastCalendarDate(date: string, today = new Date()): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const day = Number(match[3]);
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, day);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (Number.isNaN(parsed.getTime()) || parsed >= startOfToday) return date;

  let monthIndex = today.getMonth();
  if (today.getDate() > day) monthIndex += 1;
  let next = new Date(today.getFullYear(), monthIndex, day);
  if (next < startOfToday) next = new Date(today.getFullYear(), monthIndex + 1, day);
  const month = String(next.getMonth() + 1).padStart(2, "0");
  const dayText = String(next.getDate()).padStart(2, "0");
  return `${next.getFullYear()}-${month}-${dayText}`;
}
