"use client";

import type { CalendarListItem, ExternalCalendarEventsResponse } from "@/hooks/api/calendar";
import type { IntegrationConnection } from "@/hooks/api/integrations";
import { BigCalendarWrapper, type BigCalEvent, type View, type SlotInfo } from "./big-calendar-wrapper";
import { useHrCalendarEventsMapped } from "./use-hr-calendar-events";
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
}: CalendarGridLayerProps) {
  const { hrCalEvents } = useHrCalendarEventsMapped(rangeStart, rangeEnd, hrEventsVisible);

  const { allCalEvents } = useCalendarComputed({
    events,
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
