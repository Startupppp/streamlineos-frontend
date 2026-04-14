"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCalendarEvents } from "@/lib/api/hooks/calendar";
import type { CalendarListItem } from "@/lib/api/hooks/calendar";
import { EventCreateDialog } from "./event-create-dialog";
import { EventDetailSheet } from "./event-detail-sheet";
import type { View, SlotInfo, BigCalEvent } from "./big-calendar-wrapper";

const BigCalendarWrapper = dynamic(
  () => import("./big-calendar-wrapper").then((m) => ({ default: m.BigCalendarWrapper })),
  { ssr: false }
);

const EVENT_COLORS: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#f59e0b",
  purple: "#a855f7",
  gold: "#bd882c",
};

const VIEWS: View[] = ["month", "week", "day"];

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [createSlot, setCreateSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  // ID is a string like "event-123" matching CalendarListItem.id
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const rangeStart = useMemo(() => startOfMonth(subMonths(currentDate, 0)), [currentDate]);
  const rangeEnd = useMemo(() => endOfMonth(addMonths(currentDate, 1)), [currentDate]);

  const { data: events = [] } = useCalendarEvents(rangeStart, rangeEnd);

  const selectedEvent = useMemo<CalendarListItem | null>(
    () => (selectedEventId !== null ? (events.find((e) => e.id === selectedEventId) ?? null) : null),
    [selectedEventId, events]
  );

  const calEvents = useMemo(
    () =>
      events.map((e) => ({
        id: e.id,
        title: e.title,
        // API returns serialised Date objects as ISO strings under `start`/`end`
        start: new Date(e.start),
        end: new Date(e.end),
        allDay: e.allDay ?? false,
        resource: {
          color: e.color,
          category: e.category,
          description: e.description,
          location: e.location,
        },
      })),
    [events]
  );

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setCreateSlot({ start: slotInfo.start, end: slotInfo.end });
    setIsCreateOpen(true);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setCreateSlot(null);
    setIsCreateOpen(true);
  }, []);

  const handleSelectEvent = useCallback((event: BigCalEvent) => {
    // BigCalEvent.id is string (the prefixed CalendarListItem.id)
    setSelectedEventId(String(event.id));
  }, []);

  const eventPropGetter = useCallback(
    (event: BigCalEvent) => ({
      style: {
        backgroundColor: EVENT_COLORS[event.resource?.color ?? "blue"] ?? EVENT_COLORS.blue,
        border: "none",
        borderRadius: "4px",
        color: "#fff",
        fontSize: "12px",
        padding: "1px 6px",
      },
    }),
    []
  );

  const handlePrev = useCallback(() => {
    setCurrentDate((d) => {
      if (view === "month") return subMonths(d, 1);
      if (view === "week") return subWeeks(d, 1);
      return subDays(d, 1);
    });
  }, [view]);

  const handleNext = useCallback(() => {
    setCurrentDate((d) => {
      if (view === "month") return addMonths(d, 1);
      if (view === "week") return addWeeks(d, 1);
      return addDays(d, 1);
    });
  }, [view]);

  const handleToday = useCallback(() => setCurrentDate(new Date()), []);

  const handleExport = useCallback(
    (range: "month" | "3months" | "year") => {
      let from: Date;
      let to: Date;
      if (range === "month") {
        from = startOfMonth(currentDate);
        to = endOfMonth(currentDate);
      } else if (range === "3months") {
        from = startOfMonth(currentDate);
        to = endOfMonth(addMonths(currentDate, 2));
      } else {
        from = startOfYear(currentDate);
        to = endOfYear(currentDate);
      }
      const fromStr = format(from, "yyyy-MM-dd");
      const toStr = format(to, "yyyy-MM-dd");
      window.open(`/api/calendar/export?from=${fromStr}&to=${toStr}`, "_blank");
    },
    [currentDate]
  );

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Previous"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold min-w-[140px] text-center">
            {view === "month" && format(currentDate, "MMMM yyyy")}
            {view === "week" && `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d")} – ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d, yyyy")}`}
            {view === "day" && format(currentDate, "EEE, MMM d, yyyy")}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Next"
            onClick={handleNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleToday}>
            Today
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border overflow-hidden h-8">
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-3 text-xs capitalize transition-colors ${
                  view === v
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs" aria-label="Export calendar">
                <Download className="h-3.5 w-3.5 mr-1" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs">Export to .ics</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs" onClick={() => handleExport("month")}>
                This month
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs" onClick={() => handleExport("3months")}>
                Next 3 months
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs" onClick={() => handleExport("year")}>
                This year
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="h-8 text-xs" onClick={handleOpenCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Event
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-lg border border-border overflow-y-auto bg-card calendar-container">
        <BigCalendarWrapper
          events={calEvents}
          date={currentDate}
          view={view}
          onView={setView}
          onNavigate={setCurrentDate}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventPropGetter}
        />
      </div>

      <EventCreateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        defaultSlot={createSlot}
      />

      <EventDetailSheet
        event={selectedEvent}
        onClose={() => setSelectedEventId(null)}
      />
    </div>
  );
}
