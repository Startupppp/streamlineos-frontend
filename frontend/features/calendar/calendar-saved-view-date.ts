import { addDays, addMonths, addWeeks, differenceInCalendarDays, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import type { CalendarSavedViewDefinition } from "@/hooks/api/calendar-saved-view-schema";
import type { View } from "./big-calendar-wrapper";

export function calendarSavedViewGridView(
  dateLogic: CalendarSavedViewDefinition["dateLogic"],
): View {
  if (dateLogic.kind === "today") return "day";
  if (dateLogic.kind === "this-week" || dateLogic.kind === "next-seven-days") return "week";
  if (dateLogic.kind === "this-month") return "month";
  const days = differenceInCalendarDays(new Date(dateLogic.end), new Date(dateLogic.start));
  return days <= 1 ? "day" : days <= 7 ? "week" : "month";
}

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
