import {
  addHours,
  differenceInMinutes,
  endOfDay,
  format,
  parseISO,
  startOfDay,
} from "date-fns";
import type { CalendarListItem } from "@/hooks/api/calendar";

export type EventCategory =
  | "general"
  | "meeting"
  | "deadline"
  | "reminder"
  | "leave"
  | "project"
  | "other";

export interface FormState {
  title: string;
  description: string;
  location: string;
  allDay: boolean;
  color: string;
  category: EventCategory;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  attendeeIds: string[];
  locationError: string;
  syncConnectionId: string;
  addConference: boolean;
}

export function toDefaultForm(
  slot?: { start: Date; end: Date } | null,
): FormState {
  const start = slot?.start ?? new Date();
  const end = slot?.end ?? addHours(start, 1);
  return {
    title: "",
    description: "",
    location: "",
    allDay: false,
    color: "blue",
    category: "general",
    startDate: format(start, "yyyy-MM-dd"),
    startTime: format(start, "HH:mm"),
    endDate: format(end, "yyyy-MM-dd"),
    endTime: format(end, "HH:mm"),
    attendeeIds: [],
    locationError: "",
    syncConnectionId: "none",
    addConference: true,
  };
}

export function toEditForm(event: CalendarListItem): FormState {
  const start = new Date(event.start);
  const end = new Date(event.end);
  return {
    title: event.title,
    description: event.description ?? "",
    location: event.location ?? "",
    allDay: event.allDay ?? false,
    color: event.color ?? "blue",
    category: (event.category as EventCategory) ?? "general",
    startDate: format(start, "yyyy-MM-dd"),
    startTime: format(start, "HH:mm"),
    endDate: format(end, "yyyy-MM-dd"),
    endTime: format(end, "HH:mm"),
    attendeeIds: [],
    locationError: "",
    syncConnectionId: "none",
    addConference: false,
  };
}

export function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function needsEndDateField(
  form: Pick<
    FormState,
    "startDate" | "startTime" | "endDate" | "endTime" | "allDay"
  >,
): boolean {
  if (form.startDate !== form.endDate) return true;
  if (form.allDay) return false;
  if (!form.startTime || !form.endTime) return false;
  const start = parseISO(`${form.startDate}T${form.startTime}`);
  const end = parseISO(`${form.endDate}T${form.endTime}`);
  return differenceInMinutes(end, start) !== 60;
}

export function resolveEventDateTimes(
  form: FormState,
  showEndDate: boolean,
): { start: Date; end: Date } | null {
  if (!form.startDate) return null;
  const start = form.allDay
    ? startOfDay(parseISO(form.startDate))
    : parseISO(`${form.startDate}T${form.startTime}`);
  if (showEndDate) {
    if (!form.endDate || (!form.allDay && !form.endTime)) return null;
    const end = form.allDay
      ? endOfDay(parseISO(form.endDate))
      : parseISO(`${form.endDate}T${form.endTime}`);
    return { start, end };
  }
  return {
    start,
    end: form.allDay ? endOfDay(parseISO(form.startDate)) : addHours(start, 1),
  };
}

export function getDateTimeError(
  form: FormState,
  showEndDate: boolean,
): string {
  if (!showEndDate) return "";
  const resolved = resolveEventDateTimes(form, true);
  return resolved && resolved.end < resolved.start
    ? "End must be on or after start"
    : "";
}
