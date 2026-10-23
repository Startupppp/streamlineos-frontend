"use client";

import { useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
} from "date-fns";
import type {
  CalendarListItem,
  ExternalCalendarEventsResponse,
} from "@/hooks/api/calendar";
import type { IntegrationConnection } from "@/hooks/api/integrations";
import type { BigCalEvent, View } from "./big-calendar-wrapper";
import { accountColor } from "./calendar-account-colors";
import { formatInZone, fromZonedWallClock, readerTimeZone, zonedWallClock } from "@/lib/date-utils";

export type CalendarSourceFamily =
  | "calendar"
  | "build"
  | "tasks"
  | "crm"
  | "hr"
  | "attendance"
  | "external"
  | "other";

export function calendarSourceFamily(
  event: CalendarListItem,
): CalendarSourceFamily {
  const sourceKey = event.sourceKey.toLowerCase();
  if (sourceKey === "calendar" || sourceKey === "calendar-events") return "calendar";
  if (sourceKey === "build") return "build";
  if (sourceKey === "tasks") return "tasks";
  if (sourceKey === "hr-attendance") return "attendance";
  if (sourceKey.startsWith("hr-")) return "hr";
  if (sourceKey.startsWith("crm")) return "crm";
  if (sourceKey.startsWith("external:")) return "external";
  return "other";
}

export function eventOverlapsRange(
  event: Pick<CalendarListItem, "start" | "end" | "time">,
  range: { start: Date; end: Date },
  timeZone: string = readerTimeZone(),
): boolean {
  if (
    !Number.isFinite(range.start.getTime()) ||
    !Number.isFinite(range.end.getTime()) ||
    range.start.getTime() >= range.end.getTime()
  )
    return false;
  if (event.time.kind === "date") {
    const firstDate = formatInZone(range.start, timeZone, "yyyy-MM-dd");
    const lastDate = formatInZone(new Date(range.end.getTime() - 1), timeZone, "yyyy-MM-dd");
    return event.time.startDate <= lastDate && event.time.endDate >= firstDate;
  }
  const eventStart = new Date(event.start).getTime();
  const eventEnd = new Date(event.end).getTime();
  const rangeStart = range.start.getTime();
  const rangeEnd = range.end.getTime();
  return (
    Number.isFinite(eventStart) &&
    Number.isFinite(eventEnd) &&
    eventStart < rangeEnd &&
    eventEnd > rangeStart
  );
}

export function filterCalendarEventsBySources(
  events: CalendarListItem[],
  filters: {
    hrVisible: boolean;
    crmVisible: boolean;
    attendanceVisible: boolean;
    hiddenConnectionIds?: readonly number[];
  },
): CalendarListItem[] {
  return events.filter((event) => {
    const family = calendarSourceFamily(event);
    if (!filters.attendanceVisible && family === "attendance") return false;
    if (!filters.crmVisible && family === "crm") return false;
    if (!filters.hrVisible && family === "hr") return false;
    if (
      family === "external" &&
      event.connectionId !== undefined &&
      filters.hiddenConnectionIds?.includes(event.connectionId)
    )
      return false;
    return true;
  });
}

export function mergeSelfAttendanceEvents(
  events: CalendarListItem[],
  selfAttendanceEvents: CalendarListItem[],
  timeZone: string = readerTimeZone(),
): CalendarListItem[] {
  if (selfAttendanceEvents.length === 0) return events;
  const aggregateAttendanceDates = new Set(
    events
      .filter((event) => calendarSourceFamily(event) === "attendance")
      .map((event) =>
        event.time.kind === "date"
          ? event.time.startDate
          : formatInZone(new Date(event.start), timeZone, "yyyy-MM-dd"),
      ),
  );
  const additions = selfAttendanceEvents.filter(
    (event) =>
      !aggregateAttendanceDates.has(
        event.time.kind === "date"
          ? event.time.startDate
          : formatInZone(new Date(event.start), timeZone, "yyyy-MM-dd"),
      ),
  );
  if (additions.length === 0) return events;
  return [...events, ...additions];
}

function normalizeExternalEvents(
  externalData: ExternalCalendarEventsResponse | undefined,
  hiddenIds: readonly number[],
): CalendarListItem[] {
  return (externalData?.events ?? [])
    .filter((event) => !hiddenIds.includes(event.connectionId))
    .map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      color: null,
      category: "external",
      source: "external",
      sourceKey: event.sourceKey,
      sourceRecordId: event.sourceRecordId,
      occurrenceId: event.occurrenceId,
      status: event.status,
      timeKind: event.timeKind,
      time:
        event.timeKind === "date"
          ? {
              kind: "date" as const,
              startDate: event.start.slice(0, 10),
              endDate: (new Date(event.end).getTime() >
              new Date(event.start).getTime()
                ? new Date(new Date(event.end).getTime() - 1).toISOString()
                : event.end
              ).slice(0, 10),
            }
          : {
              kind: "timed" as const,
              start: event.start,
              end: event.end,
              timezone: event.timezone ?? null,
            },
      availability: event.availability,
      sourceVersion: event.sourceVersion,
      actions: event.actions,
      freshness: event.freshness,
      timezone: event.timezone,
      location: event.location,
      connectionId: event.connectionId,
      accountEmail: event.accountEmail,
      meetingUrl: event.meetingUrl,
      webLink: event.webLink,
    }));
}

export function toBigCalEvent(
  event: CalendarListItem,
  connections: IntegrationConnection[] = [],
  timeZone: string = readerTimeZone(),
): BigCalEvent {
  const family = calendarSourceFamily(event);
  const connectionIndex =
    event.connectionId === undefined
      ? -1
      : connections.findIndex(
          (connection) => connection.id === event.connectionId,
        );
  return {
    id: event.id,
    title: event.title,
    start:
      event.time.kind === "date"
        ? new Date(`${event.time.startDate}T00:00:00`)
        : zonedWallClock(new Date(event.start), timeZone),
    end:
      event.time.kind === "date"
        ? new Date(`${event.time.endDate}T23:59:59.999`)
        : zonedWallClock(new Date(event.end), timeZone),
    allDay: (event.allDay ?? false) || event.time.kind === "date",
    resource: {
      color:
        family === "external"
          ? accountColor(connectionIndex === -1 ? 0 : connectionIndex)
          : event.color,
      category: event.category,
      timezone: event.timezone,
      description: event.description,
      location: event.location,
      source: family === "hr" || family === "attendance" ? "hr" : event.source,
      sourceFamily: family,
      sourceKey: event.sourceKey,
      sourceRecordId: event.sourceRecordId,
      status: event.status,
      actions: event.actions,
      myRsvpStatus: event.myRsvpStatus,
      entityType: event.entityType,
      entityId: event.entityId,
      projectId: event.projectId,
      accountEmail: event.accountEmail,
      meetingUrl: event.meetingUrl,
      webLink: event.webLink,
      connectionId: event.connectionId,
      externalId: family === "external" ? event.id : null,
      hrEventType: family === "hr" ? event.category.toUpperCase() : undefined,
    },
  };
}

interface UseCalendarComputedParams {
  events: CalendarListItem[];
  externalData: ExternalCalendarEventsResponse | undefined;
  hiddenIds: readonly number[];
  connections: IntegrationConnection[];
  currentDate: Date;
  view: View;
  hrVisible?: boolean;
  crmVisible?: boolean;
  attendanceVisible?: boolean;
  timeZone?: string;
}

export function useCalendarComputed({
  events,
  externalData,
  hiddenIds,
  connections,
  currentDate,
  view,
  hrVisible = true,
  crmVisible = true,
  attendanceVisible = true,
  timeZone = readerTimeZone(),
}: UseCalendarComputedParams) {
  const [historyCutoff] = useState(() => Date.now());
  const unifiedEvents = useMemo(() => {
    const mirroredKeys = new Set(
      events
        .filter((e) => e.syncedProviderEventId && e.connectionId !== undefined)
        .map((e) => `${e.connectionId}:${e.syncedProviderEventId}`),
    );
    const dedupedExternal: typeof externalData = externalData
      ? { ...externalData, events: externalData.events.filter((e) => !mirroredKeys.has(`${e.connectionId}:${e.providerEventId}`)) }
      : undefined;
    return [...events, ...normalizeExternalEvents(dedupedExternal, hiddenIds)];
  }, [events, externalData, hiddenIds]);

  const visibleEvents = useMemo(
    () =>
      filterCalendarEventsBySources(unifiedEvents, {
        attendanceVisible,
        crmVisible,
        hrVisible,
      }),
    [attendanceVisible, crmVisible, hrVisible, unifiedEvents],
  );

  const allCalEvents = useMemo(
    () => visibleEvents.map((event) => toBigCalEvent(event, connections, timeZone)),
    [connections, timeZone, visibleEvents],
  );

  const formattedRange = useMemo(() => {
    if (view === "month") return format(currentDate, "MMMM yyyy");
    if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      const sameYear = start.getFullYear() === end.getFullYear();
      if (start.getMonth() === end.getMonth() && sameYear)
        return `${format(start, "MMM d")}–${format(end, "d, yyyy")}`;

      if (sameYear)
        return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;

      return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
    }
    return format(currentDate, "eeee, MMMM d, yyyy");
  }, [currentDate, view]);

  const visibleRange = useMemo(() => {
    const inZone = (start: Date, end: Date) => ({
      start: fromZonedWallClock(start, timeZone),
      end: fromZonedWallClock(new Date(end.getTime() + 1), timeZone),
    });
    if (view === "month") return inZone(startOfMonth(currentDate), endOfMonth(currentDate));
    if (view === "week")
      return inZone(startOfWeek(currentDate, { weekStartsOn: 1 }), endOfWeek(currentDate, { weekStartsOn: 1 }));
    return inZone(startOfDay(currentDate), endOfDay(currentDate));
  }, [currentDate, timeZone, view]);

  const rangeEvents = useMemo(
    () =>
      visibleEvents
        .filter((event) => eventOverlapsRange(event, visibleRange, timeZone))
        .sort(
          (left, right) =>
            new Date(left.start).getTime() - new Date(right.start).getTime(),
        ),
    [timeZone, visibleEvents, visibleRange],
  );

  const historyEvents = useMemo(
    () =>
      visibleEvents
        .filter((event) => new Date(event.end).getTime() < historyCutoff)
        .sort(
          (left, right) =>
            new Date(right.start).getTime() - new Date(left.start).getTime(),
        ),
    [historyCutoff, visibleEvents],
  );

  return {
    allCalEvents,
    visibleEvents,
    rangeEvents,
    historyEvents,
    formattedRange,
    visibleRange,
  };
}
