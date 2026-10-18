"use client";

import { BigCalendarWrapper, type BigCalEvent, type EventMoveArgs, type View, type SlotInfo } from "./big-calendar-wrapper";
import { useEventPropGetter } from "./use-event-prop-getter";

interface CalendarGridLayerProps {
  events: BigCalEvent[];
  currentDate: Date;
  view: View;
  calHeight: number;
  onView: (view: View) => void;
  onNavigate: (date: Date) => void;
  onSelectSlot: ((slotInfo: SlotInfo) => void) | undefined;
  onSelectEvent: (event: BigCalEvent) => void;
  onEventDrop?: (args: EventMoveArgs) => void;
  onEventResize?: (args: EventMoveArgs) => void;
}

export function CalendarGridLayer({
  events,
  currentDate,
  view,
  calHeight,
  onView,
  onNavigate,
  onSelectSlot,
  onSelectEvent,
  onEventDrop,
  onEventResize,
}: CalendarGridLayerProps) {
  const eventPropGetter = useEventPropGetter();

  return (
    <BigCalendarWrapper
      events={events}
      date={currentDate}
      view={view}
      calHeight={calHeight}
      onView={onView}
      onNavigate={onNavigate}
      onSelectSlot={onSelectSlot}
      onSelectEvent={onSelectEvent}
      eventPropGetter={eventPropGetter}
      onEventDrop={onEventDrop}
      onEventResize={onEventResize}
    />
  );
}
