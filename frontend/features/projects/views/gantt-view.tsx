"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Ticket {
  id: number;
  title: string;
  status: string;
  type: string;
  startDate?: string | null;
  dueDate?: string | null;
  ticketNumber?: number;
  sequenceId?: string | null;
  assignee?: { id: string; firstName?: string | null; lastName?: string | null } | null;
}

interface GanttViewProps {
  tickets: Ticket[];
  onTicketClick: (ticketId: number) => void;
}

const statusColors: Record<string, string> = {
  TODO: "#94a3b8",
  IN_PROGRESS: "#3b82f6",
  IN_REVIEW: "#d97706",
  DONE: "#22c55e",
};

export function GanttView({ tickets, onTicketClick }: GanttViewProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const datedTickets = useMemo(
    () => tickets.filter((t) => t.startDate || t.dueDate),
    [tickets]
  );

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

  const numDays = viewportWidth < 640 ? 14 : viewportWidth < 1024 ? 21 : 28;
  const dayWidth = viewportWidth < 640 ? 28 : viewportWidth < 1024 ? 34 : 40;
  const rowHeight = 36;
  const labelWidth = viewportWidth < 640 ? 120 : viewportWidth < 1024 ? 180 : 240;

  const days = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < numDays; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [startOfWeek, numDays]);

  const toDateStr = (d: Date) => d.toISOString().split("T")[0];
  const today = toDateStr(new Date());

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const jumpToMonth = useCallback((year: number, month: number) => {
    const target = new Date(year, month, 1);
    const now = new Date();
    now.setDate(now.getDate() - now.getDay());
    now.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000));
    setWeekOffset(diff);
  }, []);

  const displayDate = startOfWeek;
  const displayMonth = displayDate.getMonth();
  const displayYear = displayDate.getFullYear();

  const handleMonthChange = useCallback(
    (v: string) => jumpToMonth(displayYear, parseInt(v, 10)),
    [displayYear, jumpToMonth]
  );
  const handleYearChange = useCallback(
    (v: string) => jumpToMonth(parseInt(v, 10), displayMonth),
    [displayMonth, jumpToMonth]
  );
  const handlePrevWeek = useCallback(() => setWeekOffset((w) => w - 1), []);
  const handleResetWeek = useCallback(() => setWeekOffset(0), []);
  const handleNextWeek = useCallback(() => setWeekOffset((w) => w + 1), []);
  const handleGanttRowClick = useCallback(
    (e: React.MouseEvent<SVGGElement>) => {
      const id = Number(e.currentTarget.dataset.ticketId);
      if (id) onTicketClick(id);
    },
    [onTicketClick]
  );

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Select
            value={String(displayMonth)}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i)} className="text-xs">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(displayYear)}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="h-8 w-[80px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevWeek} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={handleResetWeek}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextWeek} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <div className="min-w-max">
          <svg
            width={labelWidth + days.length * dayWidth}
            height={Math.max(datedTickets.length * rowHeight + 40, 200)}
            className="text-foreground"
          >
            <rect x={0} y={0} width={labelWidth} height={40} className="fill-muted/50" />
            <text x={12} y={26} className="fill-muted-foreground text-xs" fontSize={12}>Work Item</text>

            {days.map((day, i) => {
              const x = labelWidth + i * dayWidth;
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const isToday = toDateStr(day) === today;
              return (
                <g key={i}>
                  {isWeekend && (
                    <rect
                      x={x}
                      y={40}
                      width={dayWidth}
                      height={datedTickets.length * rowHeight}
                      className="fill-muted/30"
                    />
                  )}
                  {isToday && (
                    <rect
                      x={x}
                      y={40}
                      width={dayWidth}
                      height={datedTickets.length * rowHeight}
                      className="fill-primary/10"
                    />
                  )}
                  <line x1={x} y1={0} x2={x} y2={datedTickets.length * rowHeight + 40} className="stroke-border" strokeWidth={0.5} />
                  <text x={x + dayWidth / 2} y={16} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </text>
                  <text x={x + dayWidth / 2} y={32} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>
                    {day.getDate()}
                  </text>
                </g>
              );
            })}

            <line x1={labelWidth} y1={40} x2={labelWidth + days.length * dayWidth} y2={40} className="stroke-border" />

            {datedTickets.map((ticket, rowIdx) => {
              const y = 40 + rowIdx * rowHeight;
              const start = ticket.startDate ? new Date(ticket.startDate) : ticket.dueDate ? new Date(ticket.dueDate) : null;
              const end = ticket.dueDate ? new Date(ticket.dueDate) : start;

              if (!start || !end) return null;

              const startDay = Math.max(0, Math.floor((start.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24)));
              const endDay = Math.min(days.length - 1, Math.floor((end.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24)));

              const barX = labelWidth + startDay * dayWidth + 2;
              const barWidth = Math.max(dayWidth - 4, (endDay - startDay + 1) * dayWidth - 4);

              return (
                <g key={ticket.id} data-ticket-id={ticket.id} onClick={handleGanttRowClick} className="cursor-pointer">
                  <line x1={0} y1={y} x2={labelWidth + days.length * dayWidth} y2={y} className="stroke-border" strokeWidth={0.5} />
                  <text x={8} y={y + rowHeight / 2 + 4} className="fill-foreground" fontSize={labelWidth < 180 ? 9 : 11}>
                    {(ticket.sequenceId ?? `#${ticket.ticketNumber}`)} {ticket.title.slice(0, labelWidth < 180 ? 12 : 25)}{ticket.title.length > (labelWidth < 180 ? 12 : 25) ? "…" : ""}
                  </text>
                  {startDay <= days.length - 1 && endDay >= 0 && (
                    <rect
                      x={barX}
                      y={y + 6}
                      width={barWidth}
                      height={rowHeight - 12}
                      rx={4}
                      fill={statusColors[ticket.status] ?? "#94a3b8"}
                      opacity={0.8}
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {datedTickets.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No work items with dates found. Set start/due dates to see them on the Gantt chart.
        </div>
      )}
    </div>
  );
}
