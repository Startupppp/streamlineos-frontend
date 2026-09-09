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
