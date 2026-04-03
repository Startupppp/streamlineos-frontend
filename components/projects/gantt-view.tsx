"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Ticket {
  id: number;
  title: string;
  status: string;
  type: string;
  startDate?: string | null;
  dueDate?: string | null;
  ticketNumber: number;
  sequenceId?: string | null;
  assignee: { id: string; firstName?: string; lastName?: string } | null;
}

interface GanttViewProps {
  tickets: Ticket[];
  onTicketClick: (ticketId: number) => void;
}

const statusColors: Record<string, string> = {
  TODO: "#9ca3af",
  IN_PROGRESS: "#3b82f6",
  IN_REVIEW: "#8b5cf6",
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

  // Responsive: fewer days on smaller screens
  const [numDays, setNumDays] = useState(28);
  useMemo(() => {
    if (typeof window !== "undefined") {
      const w = window.innerWidth;
      if (w < 640) setNumDays(14);
      else if (w < 1024) setNumDays(21);
      else setNumDays(28);
    }
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

  // Responsive dimensions
  const dayWidth = typeof window !== "undefined" && window.innerWidth < 640 ? 28 : typeof window !== "undefined" && window.innerWidth < 1024 ? 34 : 40;
  const rowHeight = 36;
  const labelWidth = typeof window !== "undefined" && window.innerWidth < 640 ? 120 : typeof window !== "undefined" && window.innerWidth < 1024 ? 180 : 240;

  const toDateStr = (d: Date) => d.toISOString().split("T")[0];
  const today = toDateStr(new Date());

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Gantt Chart</h3>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setWeekOffset(0)}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
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
              <g key={ticket.id} onClick={() => onTicketClick(ticket.id)} className="cursor-pointer">
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
                    fill={statusColors[ticket.status] ?? "#9ca3af"}
                    opacity={0.8}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {datedTickets.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No work items with dates found. Set start/due dates to see them on the Gantt chart.
        </div>
      )}
    </div>
  );
}
