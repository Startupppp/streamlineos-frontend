"use client";

import { useState, useCallback, useMemo, useRef, useEffect, memo } from "react";
import { useRouter } from "next/navigation";
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
  isSameDay,
  isSameMonth,
  isWithinInterval,
} from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  DownloadIcon,
} from "@animateicons/react/lucide";
import { Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MONTHS = [
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCalendarEvents } from "@/hooks/api/calendar";
import type { CalendarListItem } from "@/hooks/api/calendar";
import { downloadCalendarExport } from "./calendar-export";
import { EventCreateDialog } from "./event-create-dialog";
import { EventDetailSheet } from "./event-detail-sheet";
import { CreateTicketFromCalendarDialog } from "./create-ticket-from-calendar-dialog";
import type { View, SlotInfo, BigCalEvent } from "./big-calendar-wrapper";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const BigCalendarWrapper = dynamic(
  () =>
    import("./big-calendar-wrapper").then((m) => ({
      default: m.BigCalendarWrapper,
    })),
  { ssr: false },
);

const EVENT_COLORS: Record<string, string> = {
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#f59e0b",
  purple: "#a855f7",
  gold: "#3b82f6",
};

const RSVP_BORDER_COLORS: Record<string, string> = {
  accepted: "#22c55e",
  declined: "#ef4444",
  tentative: "#f59e0b",
};

const CATEGORY_COLORS: Record<string, string> = {
  huddle: "#f97316",
};

const VIEWS: View[] = ["month", "week", "day"];

const toolbarControlClassName =
  "h-8 bg-card border-border text-xs font-normal shadow-xs hover:border-blue-300 focus-visible:border-blue-500 focus-visible:ring-blue-200 focus-visible:ring-[3px]";

function buildScrollToTime(view: View, currentDate: Date): Date {
  const now = new Date();
  const morning = new Date();
  morning.setHours(8, 0, 0, 0);

  if (view === "day" && isSameDay(currentDate, now)) {
    const scrollTarget = new Date(now);
    scrollTarget.setHours(Math.max(0, now.getHours() - 1), now.getMinutes(), 0, 0);
    return scrollTarget;
  }

  if (view === "week") {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    if (isWithinInterval(now, { start: weekStart, end: weekEnd })) {
      const scrollTarget = new Date(now);
      scrollTarget.setHours(Math.max(0, now.getHours() - 1), now.getMinutes(), 0, 0);
      return scrollTarget;
    }
  }

  return morning;
}

interface ViewButtonProps {
  v: View;
  current: View;
  onSelect: (v: View) => void;
}

const ViewButton = memo(function ViewButton({
  v,
  current,
  onSelect,
}: ViewButtonProps) {
  const handleClick = useCallback(() => onSelect(v), [v, onSelect]);
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex-1 min-w-0 md:flex-none px-2 md:px-3 text-[11px] md:text-xs capitalize transition-colors h-full border-r border-border last:border-r-0",
        current === v
          ? "bg-primary text-primary-foreground font-semibold"
          : "bg-card text-foreground hover:bg-muted/50",
      )}
    >
      {v}
    </button>
  );
});

export function CalendarView() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [scrollKey, setScrollKey] = useState(0);

  const calContainerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600);
  const [compactLayout, setCompactLayout] = useState(false);
  useEffect(() => {
    const el = calContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setCompactLayout(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const calHeight = Math.max(
    containerHeight + (compactLayout ? 60 : 200),
    compactLayout ? 480 : 900,
  );
  const [createSlot, setCreateSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isSlotChoiceOpen, setIsSlotChoiceOpen] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [createTicketSlot, setCreateTicketSlot] = useState<{ start: Date; end: Date } | null>(null);

  const rangeStart = useMemo(
    () => startOfMonth(subMonths(currentDate, 0)),
    [currentDate],
  );
  const rangeEnd = useMemo(
    () => endOfMonth(addMonths(currentDate, 1)),
    [currentDate],
  );

  const { data: events = [] } = useCalendarEvents(rangeStart, rangeEnd);

  const selectedEvent = useMemo<CalendarListItem | null>(
    () =>
      selectedEventId !== null
        ? (events.find((e) => e.id === selectedEventId) ?? null)
        : null,
    [selectedEventId, events],
  );

  const calEvents = useMemo(
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

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setPendingSlot({ start: slotInfo.start, end: slotInfo.end });
    setIsSlotChoiceOpen(true);
  }, []);

  const handleSlotChooseEvent = useCallback(() => {
    setIsSlotChoiceOpen(false);
    setCreateSlot(pendingSlot);
    setIsCreateOpen(true);
  }, [pendingSlot]);

  const handleSlotChooseTicket = useCallback(() => {
    setIsSlotChoiceOpen(false);
    setCreateTicketSlot(pendingSlot);
    setIsCreateTicketOpen(true);
  }, [pendingSlot]);

  const handleOpenCreate = useCallback(() => {
    setCreateSlot(null);
    setIsCreateOpen(true);
  }, []);

  const handleOpenCreateTicket = useCallback(() => {
    setCreateTicketSlot(null);
    setIsCreateTicketOpen(true);
  }, []);

  const handleSelectEvent = useCallback(
    (event: BigCalEvent) => {
      if (
        event.resource?.source === "task" &&
        event.resource.entityType === "ticket" &&
        event.resource.projectId != null &&
        event.resource.entityId != null
      ) {
        router.push(
          `/projects/${event.resource.projectId}?ticket=${event.resource.entityId}`,
        );
        return;
      }
      setSelectedEventId(String(event.id));
    },
    [router],
  );

  const eventPropGetter = useCallback((event: BigCalEvent) => {
    if (event.resource?.source === "task") {
      return {
        style: {
          backgroundColor: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          color: "var(--foreground)",
          fontSize: "11px",
          padding: "1px 6px",
        },
      };
    }
    const rsvp = event.resource?.myRsvpStatus as string | null | undefined;
    const rsvpBorderColor = rsvp ? (RSVP_BORDER_COLORS[rsvp] ?? null) : null;
    const categoryColor = event.resource?.category
      ? (CATEGORY_COLORS[event.resource.category] ?? null)
      : null;
    return {
      style: {
        backgroundColor:
          categoryColor ??
          (EVENT_COLORS[event.resource?.color ?? "blue"] ?? EVENT_COLORS.blue),
        border: "none",
        borderLeft: rsvpBorderColor ? `4px solid ${rsvpBorderColor}` : "none",
        borderRadius: "4px",
        color: "#fff",
        fontSize: "12px",
        padding: rsvpBorderColor ? "1px 6px 1px 4px" : "1px 6px",
      },
    };
  }, []);

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

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
    setScrollKey((key) => key + 1);
  }, []);

  const handleMonthChange = useCallback(
    (monthStr: string) => {
      const month = parseInt(monthStr, 10);
      setCurrentDate((d) => {
        const year = d.getFullYear();
        if (view === "month") return new Date(year, month, 1);
        const maxDay = new Date(year, month + 1, 0).getDate();
        return new Date(year, month, Math.min(d.getDate(), maxDay));
      });
    },
    [view],
  );

  const handleYearChange = useCallback(
    (yearStr: string) => {
      const year = parseInt(yearStr, 10);
      setCurrentDate((d) => {
        if (view === "month") return new Date(year, d.getMonth(), 1);
        const maxDay = new Date(year, d.getMonth() + 1, 0).getDate();
        return new Date(year, d.getMonth(), Math.min(d.getDate(), maxDay));
      });
    },
    [view],
  );

  const handleExport = useCallback(
    async (range: "month" | "3months" | "year") => {
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
      try {
        await downloadCalendarExport(fromStr, toStr);
      } catch {
        toast.error("Failed to export calendar");
      }
    },
    [currentDate],
  );

  const handleExportMonth = useCallback(() => {
    void handleExport("month");
  }, [handleExport]);
  const handleExport3Months = useCallback(() => {
    void handleExport("3months");
  }, [handleExport]);
  const handleExportYear = useCallback(() => {
    void handleExport("year");
  }, [handleExport]);

  const handleCloseDetail = useCallback(() => setSelectedEventId(null), []);

  const calMonth = currentDate.getMonth();
  const calYear = currentDate.getFullYear();
  const yearOptions = useMemo(
    () => Array.from({ length: 11 }, (_, i) => calYear - 5 + i),
    [calYear],
  );

  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate],
  );
  const weekEnd = useMemo(
    () => endOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate],
  );

  const scrollToTime = useMemo(
    () => buildScrollToTime(view, currentDate),
    [view, currentDate],
  );

  const enableAutoScroll = view === "week" || view === "day";
  const calendarRemountKey = `${view}-${format(currentDate, "yyyy-MM-dd")}-${scrollKey}`;

  const showTodayButton = useMemo(() => {
    const today = new Date();
    if (view === "month") return !isSameMonth(currentDate, today);
    if (view === "week") {
      return !isWithinInterval(today, { start: weekStart, end: weekEnd });
    }
    if (view === "day") return !isSameDay(currentDate, today);
    return true;
  }, [view, currentDate, weekStart, weekEnd]);

  return (
    <div className="flex flex-col gap-2 sm:gap-3 h-full min-w-0">
      <div className="flex flex-col gap-2 shrink-0 min-w-0 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-row items-center gap-1.5 w-full min-w-0 md:flex-1 md:min-w-0">
          <Button
            variant="outline"
            size="icon"
            className={cn(toolbarControlClassName, "w-8 shrink-0 px-0 hover:bg-card")}
            aria-label="Previous"
            onClick={handlePrev}
          >
            <ChevronLeftIcon size={16} />
          </Button>
          <div
            className={cn(
              "min-w-0 md:w-[100px] md:shrink-0 md:flex-none",
              showTodayButton
                ? "w-[88px] shrink-0 sm:w-[96px]"
                : "flex-1",
            )}
          >
            <Select value={String(calMonth)} onValueChange={handleMonthChange}>
              <SelectTrigger className={cn(toolbarControlClassName, "w-full min-w-0 px-2")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i)} className="text-xs">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div
            className={cn(
              "min-w-0 md:w-[88px] md:shrink-0 md:flex-none",
              showTodayButton
                ? "w-[76px] shrink-0"
                : "flex-1",
            )}
          >
            <Select value={String(calYear)} onValueChange={handleYearChange}>
              <SelectTrigger className={cn(toolbarControlClassName, "w-full min-w-0 px-2")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)} className="text-xs">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="icon"
            className={cn(toolbarControlClassName, "w-8 shrink-0 px-0 hover:bg-card")}
            aria-label="Next"
            onClick={handleNext}
          >
            <ChevronRightIcon size={16} />
          </Button>
          {showTodayButton ? (
            <Button
              variant="outline"
              size="sm"
              className={cn(
                toolbarControlClassName,
                "min-w-0 flex-1 md:flex-none md:shrink-0 hover:bg-card",
              )}
              onClick={handleToday}
            >
              Today
            </Button>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-1.5 min-w-0 w-full md:flex-1 md:min-w-0 md:justify-end md:gap-2">
          <div className="flex min-w-0 w-full flex-1 rounded-md border border-border overflow-hidden h-8 bg-card md:w-auto md:flex-none md:shrink-0">
            {VIEWS.map((v) => (
              <ViewButton key={v} v={v} current={view} onSelect={setView} />
            ))}
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(toolbarControlClassName, "h-8 w-8 shrink-0 hover:bg-card")}
                aria-label="Export calendar"
              >
                <DownloadIcon size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs">
                Export to CSV
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs" onClick={handleExportMonth}>
                This month
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs"
                onClick={handleExport3Months}
              >
                Next 3 months
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs" onClick={handleExportYear}>
                This year
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8 text-xs gap-1 px-2 sm:px-3">
                <PlusIcon size={14} />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem className="text-xs" onClick={handleOpenCreate}>
                <PlusIcon size={14} className="mr-2 text-muted-foreground" />
                Add event
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs" onClick={handleOpenCreateTicket}>
                <Ticket className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                Add ticket due date
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </div>

      <div
        ref={calContainerRef}
        className={cn(
          "flex-1 min-h-0 min-w-0 overflow-x-hidden rounded-lg border border-border bg-white calendar-container",
          view === "month" ? "overflow-y-auto" : "overflow-hidden",
        )}
      >
        <BigCalendarWrapper
          key={calendarRemountKey}
          events={calEvents}
          date={currentDate}
          view={view}
          calHeight={calHeight}
          scrollToTime={scrollToTime}
          enableAutoScroll={enableAutoScroll}
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

      <CreateTicketFromCalendarDialog
        open={isCreateTicketOpen}
        onClose={() => setIsCreateTicketOpen(false)}
        defaultSlot={createTicketSlot}
      />

      <Dialog open={isSlotChoiceOpen} onOpenChange={setIsSlotChoiceOpen}>
        <DialogContent className="w-full max-w-none p-4 sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">What would you like to create?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Choose the type of item to add for the selected time.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Button
              variant="outline"
              className="justify-start h-8 text-xs gap-2"
              onClick={handleSlotChooseEvent}
            >
              <PlusIcon size={14} className="text-muted-foreground" />
              Calendar event
            </Button>
            <Button
              variant="outline"
              className="justify-start h-8 text-xs gap-2"
              onClick={handleSlotChooseTicket}
            >
              <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
              Ticket due date
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <EventDetailSheet event={selectedEvent} onClose={handleCloseDetail} />
    </div>
  );
}
