"use client";

import { useCallback, useMemo } from "react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { motion } from "framer-motion";
import type { CalendarListItem } from "@/hooks/api/calendar";

const CATEGORY_BLOCK_COLORS: Record<string, string> = {
  meeting: "bg-blue-500 text-white",
  call: "bg-green-500 text-white",
  demo: "bg-indigo-500 text-white",
  deadline: "bg-red-500 text-white",
  general: "bg-amber-500 text-white",
  reminder: "bg-purple-500 text-white",
  other: "bg-slate-400 text-white",
};

const START_HOUR = 8;
const HOUR_HEIGHT = 48;
const TOTAL_HOURS = 13;
const GRID_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;
const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);
const HOUR_LABELS = HOURS.map((h) => format(new Date(2024, 0, 1, h, 0, 0), "h a"));

interface CrmCalendarWeekViewProps {
  weekStartDate: Date;
  events: CalendarListItem[];
  onEventClick: (event: CalendarListItem) => void;
  onSlotClick: (date: Date) => void;
}

export function CrmCalendarWeekView({
  weekStartDate,
  events,
  onEventClick,
  onSlotClick,
}: CrmCalendarWeekViewProps) {
  const weekStart = useMemo(
    () => startOfWeek(weekStartDate, { weekStartsOn: 0 }),
    [weekStartDate]
  );

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const today = useMemo(() => new Date(), []);

  const handleEventButtonClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const eventId = e.currentTarget.dataset.eventId;
      if (!eventId) return;
      const found = events.find((ev) => ev.id === eventId);
      if (found) onEventClick(found);
    },
    [events, onEventClick],
  );

  const handleHourSlotClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const dayStr = e.currentTarget.dataset.day;
      const hourStr = e.currentTarget.dataset.hour;
      if (!dayStr || !hourStr) return;
      const slotDate = new Date(dayStr);
      slotDate.setHours(Number(hourStr), 0, 0, 0);
      onSlotClick(slotDate);
    },
    [onSlotClick],
  );

  const getTimedEventsForDay = useCallback(
    (day: Date): CalendarListItem[] =>
      events.filter((ev) => !ev.allDay && isSameDay(new Date(ev.start), day)),
    [events]
  );

  const getAllDayEventsForDay = useCallback(
    (day: Date): CalendarListItem[] =>
      events.filter((ev) => !!ev.allDay && isSameDay(new Date(ev.start), day)),
    [events]
  );

  const getEventTop = useCallback((event: CalendarListItem): number => {
    const start = new Date(event.start);
    return (
      (start.getHours() - START_HOUR) * HOUR_HEIGHT +
      (start.getMinutes() / 60) * HOUR_HEIGHT
    );
  }, []);

  const getEventHeight = useCallback((event: CalendarListItem): number => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    const durationMinutes = (end.getTime() - start.getTime()) / 60000;
    return Math.max((durationMinutes / 60) * HOUR_HEIGHT, 24);
  }, []);

  const getCategoryColor = useCallback(
    (category: string): string =>
      CATEGORY_BLOCK_COLORS[category] ?? CATEGORY_BLOCK_COLORS["other"],
    []
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="overflow-y-auto h-full"
    >
      <div className="flex">
        <div className="w-14 shrink-0 border-r border-border">
          <div className="h-10 border-b" />
          {HOURS.map((hour, idx) => (
            <div
              key={hour}
              className="h-12 flex items-start justify-end pr-2 pt-0.5 text-[11px] text-muted-foreground"
            >
              {HOUR_LABELS[idx]}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-x-auto">
          <div className="grid grid-cols-7 border-b">
            {days.map((day) => {
              const isToday = isSameDay(day, today);
              const dayAllDayEvents = getAllDayEventsForDay(day);
              return (
                <div
                  key={day.toISOString()}
                  className="border-r border-border last:border-r-0"
                >
                  <div className="h-10 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {format(day, "EEE")}
                    </span>
                    <span
                      className={[
                        "text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full leading-none",
                        isToday
                          ? "bg-violet-600 text-white"
                          : "text-foreground",
                      ].join(" ")}
                    >
                      {format(day, "d")}
                    </span>
                  </div>
                  {dayAllDayEvents.length > 0 && (
                    <div className="px-1 pb-1 flex flex-col gap-0.5">
                      {dayAllDayEvents.map((event) => (
                        <button
                          key={event.id}
                          data-event-id={event.id}
                          onClick={handleEventButtonClick}
                          className={[
                            "w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate font-medium",
                            getCategoryColor(event.category),
                          ].join(" ")}
                        >
                          {event.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-7 divide-x divide-border">
            {days.map((day) => {
              const dayTimedEvents = getTimedEventsForDay(day);
              return (
                <div
                  key={day.toISOString()}
                  className="relative"
                  style={{ height: `${GRID_HEIGHT}px` }}
                >
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      data-day={day.toISOString()}
                      data-hour={String(hour)}
                      className="border-b border-border/40 h-12 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={handleHourSlotClick}
                    />
                  ))}
                  {dayTimedEvents.map((event) => {
                    const top = getEventTop(event);
                    const height = getEventHeight(event);
                    return (
                      <button
                        key={event.id}
                        data-event-id={event.id}
                        onClick={handleEventButtonClick}
                        className={[
                          "absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-left overflow-hidden hover:opacity-90 transition-opacity",
                          getCategoryColor(event.category),
                        ].join(" ")}
                        style={{ top: `${top}px`, height: `${height}px` }}
                      >
                        <span className="block truncate text-[10px] font-semibold leading-tight">
                          {event.title}
                        </span>
                        {height > 32 && (
                          <span className="block truncate text-[9px] opacity-80 leading-tight">
                            {format(new Date(event.start), "h:mm a")}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
