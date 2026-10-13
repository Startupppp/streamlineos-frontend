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
  return {
    sourceKey,
    sourceRecordId: id,
    occurrenceId: id,
    status: null,
    timeKind: allDay ? "date" : "timed",
    time: allDay
      ? { kind: "date", startDate: start.slice(0, 10), endDate: end.slice(0, 10) }
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
