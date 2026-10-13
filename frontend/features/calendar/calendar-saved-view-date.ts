import { addDays, addMonths, addWeeks, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import type { CalendarSavedViewDefinition } from "@/hooks/api/calendar-saved-view-schema";

export function calendarSavedViewWindow(
  dateLogic: CalendarSavedViewDefinition["dateLogic"],
  now: Date,
): { start: string; end: string } {
  if (dateLogic.kind === "custom") return { start: dateLogic.start, end: dateLogic.end };
  if (dateLogic.kind === "today") {
    const start = startOfDay(now);
    return { start: start.toISOString(), end: addDays(start, 1).toISOString() };
  }
  if (dateLogic.kind === "next-seven-days") {
    const start = startOfDay(now);
    return { start: start.toISOString(), end: addDays(start, 7).toISOString() };
  }
  if (dateLogic.kind === "this-week") {
    const start = startOfWeek(now, { weekStartsOn: 1 });
    return { start: start.toISOString(), end: addWeeks(start, 1).toISOString() };
  }
  const start = startOfMonth(now);
  return { start: start.toISOString(), end: addMonths(start, 1).toISOString() };
}

export function calendarSavedViewDateLogic(
  kind: CalendarSavedViewDefinition["dateLogic"]["kind"],
  currentDate: Date,
): CalendarSavedViewDefinition["dateLogic"] {
  if (kind !== "custom") return { kind };
  const start = startOfDay(currentDate);
  return { kind, start: start.toISOString(), end: addDays(start, 1).toISOString() };
}
