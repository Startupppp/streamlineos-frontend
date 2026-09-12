import { format, parseISO } from "date-fns";

/**
 * The name a screen reader announces for one day of the week.
 *
 * Used as the week grid's column header and as the Day tab's day-picker label,
 * so both surfaces say the same thing. The visible chrome is "Wed / 10" plus a
 * background tint, which is unambiguous when you can see seven of them side by
 * side and useless read one cell at a time — and the tint was the only carrier
 * of "this is a holiday", so a holiday was invisible to exactly the users who
 * cannot see it.
 */
export function describeDayColumn(date: string, holiday: string | undefined): string {
  const label = format(parseISO(date), "EEEE d MMMM");
  return holiday ? `${label}, company holiday: ${holiday}` : label;
}

/**
 * The accessible name of one editable cell in the week grid.
 *
 * Every cell was an unnamed number input: a screen reader read seven of them
 * per row as "spin button, blank", with no way to tell which project or which
 * day was in focus. The row and column headers are only associated for tools
 * that walk the table as a grid — an explicit name is what a virtual cursor
 * and a braille display actually get.
 */
export function describeCell(
  rowLabel: string,
  date: string,
  holiday: string | undefined,
  locked: boolean,
): string {
  const parts = [rowLabel, describeDayColumn(date, holiday), "hours"];
  if (locked) parts.push("locked");
  return parts.join(", ");
}
