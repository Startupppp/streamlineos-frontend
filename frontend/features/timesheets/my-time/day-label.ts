import { format, parseISO } from "date-fns";

export function describeDayColumn(date: string, holiday: string | undefined): string {
  const label = format(parseISO(date), "EEEE d MMMM");
  return holiday ? `${label}, company holiday: ${holiday}` : label;
}

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
