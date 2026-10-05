"use client";

import {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
  type UIEvent,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { computeBarGeometry } from "@/features/build/views/gantt/gantt-geometry";
import { GanttTicketRows } from "@/features/build/views/gantt/gantt-ticket-rows";
import { resolveGanttRowBand } from "@/features/build/views/gantt/gantt-row-window";
import { cn } from "@/lib/utils";
import type { AllWorkTicket } from "@/types/projects";

const GANTT_MAX_DAYS = 28;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface AllWorkTimelineSectionProps {
  tickets: AllWorkTicket[];
  hasMore: boolean;
  onTicketClick: (ticketId: number) => void;
}

export function AllWorkTimelineSection({
  tickets,
  hasMore,
  onTicketClick,
}: AllWorkTimelineSectionProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const startOfWeek = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + weekOffset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [weekOffset]);

  const [viewportWidth, setViewportWidth] = useState(1280);
  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const numDays = viewportWidth < 640 ? 14 : viewportWidth < 1024 ? 21 : GANTT_MAX_DAYS;
  const dayWidth = viewportWidth < 640 ? 32 : viewportWidth < 1024 ? 36 : 40;
  const rowHeight = 40;
  const headerHeight = 40;
  const labelWidth = viewportWidth < 640 ? 144 : viewportWidth < 1024 ? 192 : 240;
  const svgWidth = labelWidth + numDays * dayWidth;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollViewportHeight, setScrollViewportHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const syncViewportHeight = () => {
      const next = el.clientHeight;
      setScrollViewportHeight((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    };
    syncViewportHeight();
    const ro = new ResizeObserver(syncViewportHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const days = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < numDays; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [startOfWeek, numDays]);

  const toDateStr = (d: Date) => d.toISOString().split("T")[0] ?? "";
  const today = toDateStr(new Date());

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const displayMonth = startOfWeek.getMonth();
  const displayYear = startOfWeek.getFullYear();

  const jumpToMonth = useCallback((year: number, month: number) => {
    const target = new Date(year, month, 1);
    const now = new Date();
    now.setDate(now.getDate() - now.getDay());
    now.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000));
    setWeekOffset(diff);
  }, []);

  const handleMonthChange = useCallback(
    (v: string) => jumpToMonth(displayYear, parseInt(v, 10)),
    [displayYear, jumpToMonth],
  );
  const handleYearChange = useCallback(
    (v: string) => jumpToMonth(parseInt(v, 10), displayMonth),
    [displayMonth, jumpToMonth],
  );
  const handlePrevWeek = useCallback(() => setWeekOffset((w) => w - 1), []);
  const handleResetWeek = useCallback(() => setWeekOffset(0), []);
  const handleNextWeek = useCallback(() => setWeekOffset((w) => w + 1), []);

  const handleScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const ganttTickets = useMemo(
    () =>
      tickets.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        ticketNumber: t.ticketNumber,
        sequenceId: t.projectKey ? `${t.projectKey}-${t.ticketNumber}` : undefined,
      })),
    [tickets],
  );

  const barGeometries = useMemo(
    () =>
      new Map(
        tickets.map((t) => [
          t.id,
          computeBarGeometry(
            t.startDate,
            t.dueDate,
            ganttTickets.findIndex((g) => g.id === t.id),
            startOfWeek,
            numDays,
            dayWidth,
            labelWidth,
            rowHeight,
          ),
        ]),
      ),
    [tickets, ganttTickets, startOfWeek, numDays, dayWidth, labelWidth],
  );

  const band = useMemo(
    () =>
      resolveGanttRowBand(
        ganttTickets.length,
        scrollTop,
        scrollViewportHeight,
        headerHeight,
        rowHeight,
      ),
    [ganttTickets.length, scrollTop, scrollViewportHeight],
  );

  const totalHeight = headerHeight + ganttTickets.length * rowHeight;

  const ticketsWithDates = useMemo(
    () => tickets.filter((t) => t.startDate || t.dueDate),
    [tickets],
  );

  if (ticketsWithDates.length === 0) {
    return (
      <EmptyState
        title="No dates set"
        description="Tickets with start or due dates will appear on the timeline."
      />
    );
  }

  return (
    <div className="flex flex-col gap-0 overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
        <Button variant="outline" size="sm" onClick={handlePrevWeek} aria-label="Previous week">
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleResetWeek}>
          Today
        </Button>
        <Button variant="outline" size="sm" onClick={handleNextWeek} aria-label="Next week">
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Select value={String(displayMonth)} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-[130px] shrink-0 font-normal" aria-label="Jump to month">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={m} value={String(i)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(displayYear)} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[90px] shrink-0 font-normal" aria-label="Jump to year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasMore && (
          <span className="ml-auto text-xs text-muted-foreground">
            Timeline shows current page only. Use pagination to navigate.
          </span>
        )}
      </div>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto"
        onScroll={handleScroll}
      >
        <svg
          width={svgWidth}
          height={totalHeight}
          aria-label="Timeline"
          role="img"
        >
          <g>
            {days.map((day, i) => {
              const dateStr = toDateStr(day);
              const isToday = dateStr === today;
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const x = labelWidth + i * dayWidth;
              return (
                <g key={dateStr}>
                  <rect
                    x={x}
                    y={0}
                    width={dayWidth}
                    height={totalHeight}
                    className={cn(
                      isToday ? "fill-primary/10" : isWeekend ? "fill-muted/50" : "fill-transparent",
                    )}
                  />
                  <text
                    x={x + dayWidth / 2}
                    y={24}
                    textAnchor="middle"
                    className={cn(
                      "text-[10px]",
                      isToday ? "fill-primary font-medium" : "fill-muted-foreground",
                    )}
                    fontSize={10}
                  >
                    {day.getDate()}
                  </text>
                </g>
              );
            })}
          </g>
          <GanttTicketRows
            tickets={ganttTickets}
            band={band}
            geometries={barGeometries}
            criticalPathIds={new Set<number>()}
            svgWidth={svgWidth}
            rowHeight={rowHeight}
            titleMax={labelWidth - 16}
            labelFontSize={12}
            onTicketClick={onTicketClick}
          />
        </svg>
      </div>
    </div>
  );
}
