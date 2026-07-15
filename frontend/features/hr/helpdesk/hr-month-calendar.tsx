"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  useHrCalendar,
  HR_CALENDAR_TYPE_COLORS,
  HR_CALENDAR_TYPE_LABELS,
  HR_CALENDAR_EVENT_TYPES,
  type HrCalendarEventType,
  type HrCalendarEvent,
} from "@/hooks/api/hr/hr-calendar";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function HrMonthCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeTypes, setActiveTypes] = useState<Set<HrCalendarEventType>>(
    new Set(HR_CALENDAR_EVENT_TYPES),
  );

  const from = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const to = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const { data: events, isLoading } = useHrCalendar({
    from,
    to,
    types: Array.from(activeTypes),
  });

  const eventsByDate = useMemo(() => {
    const map = new Map<string, HrCalendarEvent[]>();
    if (!events) return map;
    for (const ev of events) {
      const key = ev.date.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startDayOfWeek = getDay(startOfMonth(currentMonth));
  const paddingDays = Array.from({ length: startDayOfWeek }, (_, i) => i);

  const toggleType = (type: HrCalendarEventType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-7"
            onClick={() => setCurrentMonth((d) => subMonths(d, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-sm font-semibold text-foreground min-w-[130px] text-center select-none">
            {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="w-7"
            onClick={() => setCurrentMonth((d) => addMonths(d, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7"
          onClick={() => setCurrentMonth(new Date())}
        >
          Today
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {HR_CALENDAR_EVENT_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => toggleType(type)}
            className={cn(
              "text-[10px] font-medium px-2 py-0.5 rounded-full border transition-opacity",
              HR_CALENDAR_TYPE_COLORS[type],
              !activeTypes.has(type) && "opacity-40",
            )}
          >
            {HR_CALENDAR_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-8 aspect-square w-full rounded-md" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-2"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-[minmax(80px,auto)]">
            {paddingDays.map((i) => (
              <div
                key={`pad-${i}`}
                className="border-r border-b border-border last:border-r-0 bg-muted/20"
              />
            ))}
            {calendarDays.map((day, idx) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDate.get(dateStr) ?? [];
              const isTodayDay = isToday(day);
              const col = (startDayOfWeek + idx) % 7;

              return (
                <div
                  key={dateStr}
                  className={cn(
                    "border-r border-b border-border p-1.5 min-h-[80px]",
                    col === 6 && "border-r-0",
                    isTodayDay && "bg-primary/5",
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-medium block mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                      isTodayDay
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <DayEventChip key={ev.id} event={ev} />
                    ))}
                    {dayEvents.length > 3 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="text-[10px] text-muted-foreground hover:text-foreground px-1 py-0.5 rounded"
                          >
                            +{dayEvents.length - 3} more
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" align="start">
                          <p className="text-xs font-semibold text-foreground mb-2">
                            {format(day, "MMMM d, yyyy")}
                          </p>
                          <div className="space-y-1">
                            {dayEvents.map((ev) => (
                              <DayEventChip key={ev.id} event={ev} />
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DayEventChip({ event }: { event: HrCalendarEvent }) {
  return (
    <div
      title={event.title}
      className={cn(
        "text-[10px] font-medium px-1.5 py-0.5 rounded border truncate",
        HR_CALENDAR_TYPE_COLORS[event.type],
      )}
    >
      {event.title}
    </div>
  );
}
