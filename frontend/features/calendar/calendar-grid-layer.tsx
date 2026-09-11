"use client";

import { useMemo, useEffect } from "react";
import { format } from "date-fns";
import type { CalendarListItem, ExternalCalendarEventsResponse } from "@/hooks/api/calendar";
import type { IntegrationConnection } from "@/hooks/api/integrations";
import { BigCalendarWrapper, type BigCalEvent, type View, type SlotInfo } from "./big-calendar-wrapper";
import { useHrCalendarEventsMapped } from "./use-hr-calendar-events";
import { useAttendanceCalendarEvents } from "./use-attendance-calendar-events";
import { useEventPropGetter } from "./use-event-prop-getter";
import { useCalendarComputed } from "./use-calendar-computed";

interface CalendarGridLayerProps {
  events: CalendarListItem[];
  externalData: ExternalCalendarEventsResponse | undefined;
  hiddenIds: readonly number[];
  connections: IntegrationConnection[];
  currentDate: Date;
  view: View;
  rangeStart: Date;
  rangeEnd: Date;
  hrEventsVisible: boolean;
  crmEventsVisible: boolean;
  attendanceEventsVisible: boolean;
  calHeight: number;
  onView: (view: View) => void;
  onNavigate: (date: Date) => void;
  onSelectSlot: ((slotInfo: SlotInfo) => void) | undefined;
  onSelectEvent: (event: BigCalEvent) => void;
  onCalendarEventsChange: (events: CalendarListItem[]) => void;
}

export function CalendarGridLayer({
  events,
  externalData,
  hiddenIds,
  connections,
  currentDate,
  view,
  rangeStart,
  rangeEnd,
  hrEventsVisible,
  crmEventsVisible,
  attendanceEventsVisible,
  calHeight,
  onView,
  onNavigate,
  onSelectSlot,
  onSelectEvent,
  onCalendarEventsChange,
}: CalendarGridLayerProps) {
  const { hrCalEvents } = useHrCalendarEventsMapped(rangeStart, rangeEnd, hrEventsVisible);
  const selfAttendanceEvents = useAttendanceCalendarEvents(rangeStart, rangeEnd, attendanceEventsVisible);

  const calendarEvents = useMemo(() => {
    const aggregateAttendanceDates = new Set(
      events
        .filter((e) => e.source === "attendance")
        .map((e) => format(new Date(e.start), "yyyy-MM-dd")),
    );
    return [
      ...events,
      ...selfAttendanceEvents.filter(
        (e) =>
          !aggregateAttendanceDates.has(format(new Date(e.start), "yyyy-MM-dd")),
      ),
    ];
  }, [events, selfAttendanceEvents]);

  useEffect(() => {
    onCalendarEventsChange(calendarEvents);
  }, [calendarEvents, onCalendarEventsChange]);

  const { allCalEvents } = useCalendarComputed({
    events: calendarEvents,
    externalData,
    hiddenIds,
    connections,
    currentDate,
    view,
    hrCalEvents,
    hrVisible: hrEventsVisible,
    crmVisible: crmEventsVisible,
    attendanceVisible: attendanceEventsVisible,
  });

  const eventPropGetter = useEventPropGetter();

  return (
    <BigCalendarWrapper
      events={allCalEvents}
      date={currentDate}
      view={view}
      calHeight={calHeight}
      onView={onView}
      onNavigate={onNavigate}
      onSelectSlot={onSelectSlot}
      onSelectEvent={onSelectEvent}
      eventPropGetter={eventPropGetter}
    />
  );
}
