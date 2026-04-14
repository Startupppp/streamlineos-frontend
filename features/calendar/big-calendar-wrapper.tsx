"use client";
import {
  Calendar,
  dateFnsLocalizer,
  type View,
  type SlotInfo,
  type EventPropGetter,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enIN } from "date-fns/locale/en-IN";
import "react-big-calendar/lib/css/react-big-calendar.css";

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
  };
}

interface BigCalendarWrapperProps {
  events: BigCalEvent[];
  date: Date;
  view: View;
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
  onView,
  onNavigate,
  onSelectSlot,
  onSelectEvent,
  eventPropGetter,
}: BigCalendarWrapperProps) {
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
      toolbar={false}
      style={{ height: "100%" }}
    />
  );
}

export type { View, SlotInfo };
