"use client";
import { useMemo } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type View,
  type SlotInfo,
  type EventPropGetter,
  type Components,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enIN } from "date-fns/locale/en-IN";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { CalendarDayHeader } from "./calendar-day-header";
import { CalendarWeekDayHeader } from "./calendar-week-day-header";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { "en-IN": enIN },
});

export interface BigCalEvent {
  id: number | string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: {
    color?: string | null;
    category?: string;
    description?: string | null;
    location?: string | null;
    source?: string;
    myRsvpStatus?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    projectId?: number | null;
    accountEmail?: string | null;
    meetingUrl?: string | null;
    webLink?: string | null;
    connectionId?: number | null;
    externalId?: string | null;
    hrEventType?: string | null;
  };
}

interface BigCalendarWrapperProps {
  events: BigCalEvent[];
  date: Date;
  view: View;
  calHeight?: number;
  scrollToTime?: Date;
  enableAutoScroll?: boolean;
  onView: (view: View) => void;
  onNavigate: (date: Date) => void;
  onSelectSlot?: (slotInfo: SlotInfo) => void;
  onSelectEvent?: (event: BigCalEvent) => void;
  eventPropGetter?: EventPropGetter<BigCalEvent>;
}

export function BigCalendarWrapper({
  events,
  date,
  view,
  calHeight = 720,
  scrollToTime,
  enableAutoScroll = true,
  onView,
  onNavigate,
  onSelectSlot,
  onSelectEvent,
  eventPropGetter,
}: BigCalendarWrapperProps) {
  const calendarStyle =
    view === "month"
      ? { height: calHeight }
      : { height: "100%" };

  const components = useMemo<Components>(
    () => ({
      week: { header: CalendarWeekDayHeader },
      day: { header: CalendarDayHeader },
      work_week: { header: CalendarWeekDayHeader },
    }),
    [],
  );

  return (
    <Calendar
      localizer={localizer}
      events={events}
      date={date}
      view={view}
      onView={onView}
      onNavigate={onNavigate}
      selectable={!!onSelectSlot}
      onSelectSlot={onSelectSlot}
      onSelectEvent={onSelectEvent as ((event: object) => void) | undefined}
      eventPropGetter={eventPropGetter as EventPropGetter<object>}
      components={components}
      toolbar={false}
      scrollToTime={scrollToTime}
      enableAutoScroll={enableAutoScroll}
      style={calendarStyle}
    />
  );
}

export type { View, SlotInfo };
