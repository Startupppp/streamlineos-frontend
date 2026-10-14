import type { CalendarListItem, ExternalCalendarEvent } from "@/hooks/api/calendar";

type ProjectionFields = Pick<
  CalendarListItem,
  | "sourceKey"
  | "sourceRecordId"
  | "occurrenceId"
  | "status"
  | "timeKind"
  | "time"
  | "availability"
  | "sourceVersion"
  | "actions"
  | "freshness"
>;

export function calendarProjectionFields(
  id: string,
  start: string,
  end = start,
  allDay = false,
  timezone: string | null = null,
  sourceKey = "calendar-events",
): ProjectionFields {
  const dateValue = (value: string) => {
    if (sourceKey !== "calendar-events" || !timezone) return value.slice(0, 10);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date(value));
    return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)?.value).join("-");
  };
  return {
    sourceKey,
    sourceRecordId: id,
    occurrenceId: id,
    status: null,
    timeKind: allDay ? "date" : "timed",
    time: allDay
      ? { kind: "date", startDate: dateValue(start), endDate: dateValue(new Date(end).getTime() > new Date(start).getTime() ? new Date(new Date(end).getTime() - 1).toISOString() : end) }
      : { kind: "timed", start, end, timezone },
    availability: "busy",
    sourceVersion: "1",
    actions: { view: true, edit: false, delete: false, rsvp: false, complete: false },
    freshness: { state: "fresh", asOf: start },
  };
}

export function externalProjectionFields(
  connectionId: number,
  providerEventId: string,
  allDay = false,
): Pick<
  ExternalCalendarEvent,
  | "sourceKey"
  | "sourceRecordId"
  | "occurrenceId"
  | "status"
  | "timeKind"
  | "availability"
  | "sourceVersion"
  | "freshness"
> {
  return {
    sourceKey: `external:googlecalendar:${connectionId}`,
    sourceRecordId: `${connectionId}:${providerEventId}`,
    occurrenceId: `ext-${connectionId}-${providerEventId}`,
    status: null,
    timeKind: allDay ? "date" : "timed",
    availability: "busy",
    sourceVersion: null,
    freshness: { state: "fresh", asOf: null },
  };
}
