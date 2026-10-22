"use client";
import { useCallback, useEffect, useMemo, useRef, type KeyboardEvent } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type View,
  type SlotInfo,
  type EventPropGetter,
  type Components,
} from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enIN } from "date-fns/locale/en-IN";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import { CalendarDayHeader } from "./calendar-day-header";
import { CalendarWeekDayHeader } from "./calendar-week-day-header";
import { useCalendarTimeZone } from "./calendar-time-zone-context";
import { zonedWallClock } from "@/lib/date-utils";

const DnDCalendar = withDragAndDrop(Calendar);

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { "en-IN": enIN },
});

const ORPHAN_ROLE_SELECTOR =
  '.rbc-allday-cell[role="rowgroup"], .rbc-allday-cell [role="row"]';

const SCROLLABLE_REGION_SELECTOR = ".rbc-time-content";

const WORKDAY_SCROLL_TIME = new Date(1970, 0, 1, 8, 0, 0);

function normaliseVendorAccessibility(root: HTMLElement | null): void {
  if (!root) return;
  for (const node of root.querySelectorAll(ORPHAN_ROLE_SELECTOR))
    node.setAttribute("role", "presentation");
  for (const node of root.querySelectorAll(SCROLLABLE_REGION_SELECTOR))
    if (!node.hasAttribute("tabindex")) node.setAttribute("tabindex", "0");
}

export interface BigCalEvent {
  id: number | string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: {
    color?: string | null;
    category?: string;
    timezone?: string | null;
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
    sourceFamily?: string;
    sourceKey?: string;
    sourceRecordId?: string;
    status?: string | null;
    actions?: {
      view: boolean;
      edit: boolean;
      delete: boolean;
      rsvp: boolean;
      complete: boolean;
    };
  };
}

export interface EventMoveArgs {
  event: BigCalEvent;
  start: Date;
  end: Date;
  isAllDay: boolean;
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
  onEventDrop?: (args: EventMoveArgs) => void;
  onEventResize?: (args: EventMoveArgs) => void;
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
  onEventDrop,
  onEventResize,
}: BigCalendarWrapperProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const timeZone = useCalendarTimeZone();
  const getNow = useCallback(() => zonedWallClock(new Date(), timeZone), [timeZone]);

  const calendarStyle =
    view === "month"
      ? { height: calHeight }
      : { height: "100%" };

  useEffect(() => {
    normaliseVendorAccessibility(gridRef.current);
  }, [view, date, events]);

  const components = useMemo<Components>(
    () => ({
      week: { header: CalendarWeekDayHeader },
      day: { header: CalendarDayHeader },
      work_week: { header: CalendarWeekDayHeader },
    }),
    [],
  );

  const draggableAccessor = useCallback(
    (event: object) => !!(event as BigCalEvent).resource?.actions?.edit,
    [],
  );

  const handleEventDrop = useCallback(
    ({ event, start, end, isAllDay }: { event: object; start: Date | string; end: Date | string; isAllDay?: boolean }) => {
      if (onEventDrop)
        onEventDrop({ event: event as BigCalEvent, start: new Date(start), end: new Date(end), isAllDay: isAllDay ?? false });
    },
    [onEventDrop],
  );

  const handleEventResize = useCallback(
    ({ event, start, end }: { event: object; start: Date | string; end: Date | string; isAllDay?: boolean }) => {
      if (onEventResize)
        onEventResize({ event: event as BigCalEvent, start: new Date(start), end: new Date(end), isAllDay: false });
    },
    [onEventResize],
  );

  return (
    <div ref={gridRef} className="contents">
      <DnDCalendar
        localizer={localizer}
        getNow={getNow}
        events={events}
        date={date}
        view={view}
        onView={onView}
        onNavigate={onNavigate}
        selectable={!!onSelectSlot}
        onSelectSlot={onSelectSlot}
        onSelectEvent={onSelectEvent as ((event: object) => void) | undefined}
        onKeyPressEvent={(evt, e) => {
          const key = (e as KeyboardEvent<HTMLElement>).key;
          if ((key === "Enter" || key === " ") && onSelectEvent) {
            e.preventDefault();
            onSelectEvent(evt as BigCalEvent);
          }
        }}
        eventPropGetter={eventPropGetter as EventPropGetter<object>}
        components={components}
        toolbar={false}
        popup
        dayLayoutAlgorithm="no-overlap"
        scrollToTime={scrollToTime ?? WORKDAY_SCROLL_TIME}
        enableAutoScroll={enableAutoScroll}
        style={calendarStyle}
        draggableAccessor={onEventDrop ? draggableAccessor : undefined}
        resizableAccessor={onEventResize ? draggableAccessor : undefined}
        onEventDrop={onEventDrop ? handleEventDrop : undefined}
        onEventResize={onEventResize ? handleEventResize : undefined}
        resizable={!!onEventResize}
      />
    </div>
  );
}

export type { View, SlotInfo };
