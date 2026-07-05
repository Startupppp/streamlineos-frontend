"use client";

import { useMemo } from "react";
import {
  format,
  isSameDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
} from "date-fns";
import type { CalendarListItem, ExternalCalendarEventsResponse } from "@/hooks/api/calendar";
import type { IntegrationConnection } from "@/hooks/api/integrations";
import type { BigCalEvent, View } from "./big-calendar-wrapper";
import { accountColor } from "./calendar-account-colors";

interface UseCalendarComputedParams {
  events: CalendarListItem[];
  externalData: ExternalCalendarEventsResponse | undefined;
  hiddenIds: readonly number[];
  connections: IntegrationConnection[];
  currentDate: Date;
  view: View;
}

export function useCalendarComputed({
  events,
  externalData,
  hiddenIds,
  connections,
  currentDate,
  view,
}: UseCalendarComputedParams) {
  const calEvents = useMemo<BigCalEvent[]>(
    () =>
      events.map((e) => ({
        id: e.id,
        title: e.title,
        start: new Date(e.start),
        end: new Date(e.end),
        allDay: e.allDay ?? false,
        resource: {
          color: e.color,
          category: e.category,
          description: e.description,
          location: e.location,
          source: e.source,
          myRsvpStatus: e.myRsvpStatus,
          entityType: e.entityType,
          entityId: e.entityId,
          projectId: e.projectId,
        },
      })),
    [events],
  );

  const externalCalEvents = useMemo<BigCalEvent[]>(
    () =>
      (externalData?.events ?? [])
        .filter((e) => !hiddenIds.includes(e.connectionId))
        .map((e) => {
          const index = connections.findIndex((c) => c.id === e.connectionId);
          return {
            id: e.id,
            title: e.title,
            start: new Date(e.start),
            end: new Date(e.end),
            allDay: e.allDay,
            resource: {
              source: "external",
              color: accountColor(index === -1 ? 0 : index),
              location: e.location,
              accountEmail: e.accountEmail,
              meetingUrl: e.meetingUrl,
              webLink: e.webLink,
              connectionId: e.connectionId,
              externalId: e.id,
            },
          };
        }),
    [externalData, hiddenIds, connections],
  );

  const allCalEvents = useMemo(
    () => [...calEvents, ...externalCalEvents],
    [calEvents, externalCalEvents],
  );

  const todayActivities = useMemo(
    () =>
      calEvents
        .filter((e) => isSameDay(e.start, currentDate))
        .sort((a, b) => a.start.getTime() - b.start.getTime()),
    [calEvents, currentDate],
  );

  const formattedRange = useMemo(() => {
    if (view === "month") return format(currentDate, "MMMM yyyy");
    if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      const weekNumber = format(currentDate, "I");
      if (start.getMonth() === end.getMonth()) {
        return `${format(currentDate, "MMMM yyyy")} Week ${weekNumber}`;
      }
      return `${format(start, "MMM")} - ${format(end, "MMM yyyy")} Week ${weekNumber}`;
    }
    return format(currentDate, "eeee, MMMM d, yyyy");
  }, [currentDate, view]);

  const visibleRange = useMemo(() => {
    if (view === "month") {
      return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    }
    if (view === "week") {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      };
    }
    return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
  }, [currentDate, view]);

  return {
    calEvents,
    externalCalEvents,
    allCalEvents,
    todayActivities,
    formattedRange,
    visibleRange,
  };
}
