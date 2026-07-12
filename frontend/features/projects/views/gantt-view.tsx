"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, CalendarDays, List, Plus } from "lucide-react";
import { getStatusHexColor } from "../shared/status-badge";
import { useCriticalPath } from "@/hooks/api/projects/reports";
import { useProjectMilestones } from "@/hooks/api/projects/milestones";
import { computeBarGeometry } from "./gantt/gantt-geometry";
import { GanttDependencyOverlay } from "./gantt/gantt-dependency-overlay";
import { GanttMilestoneMarkers } from "./gantt/gantt-milestone-markers";

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
  assignee?: { id: string; name?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null } | null;
}

interface GanttViewProps {
  tickets: Ticket[];
  projectId: number;
  onTicketClick: (ticketId: number) => void;
  onCreateTicket?: () => void;
}

export function GanttView({ tickets, projectId, onTicketClick, onCreateTicket }: GanttViewProps) {
  const router = useRouter();
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
  const headerHeight = 40;
  const labelWidth = viewportWidth < 640 ? 120 : viewportWidth < 1024 ? 180 : 240;
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(400);

  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height);
    });
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

  const handleGoToBacklog = useCallback(() => {
    router.push(`/projects/${projectId}/backlog`);
  }, [router, projectId]);

  const { data: cpData } = useCriticalPath(projectId);
  const { data: milestones } = useProjectMilestones(projectId);

  const criticalPathIds = useMemo(
    () => new Set((cpData?.criticalPath ?? []).map((n) => n.ticketId)),
    [cpData]
  );

  const rowMap = useMemo<Map<number, number>>(
    () => new Map(datedTickets.map((t, i): [number, number] => [t.id, i])),
    [datedTickets]
  );

  const barGeometries = useMemo(
    () =>
      new Map(
        datedTickets.map((t) => [
          t.id,
          computeBarGeometry(
            t.startDate, t.dueDate,
            rowMap.get(t.id) ?? 0,
            startOfWeek, numDays, dayWidth, labelWidth, rowHeight,
          ),
        ])
      ),
    [datedTickets, rowMap, startOfWeek, numDays, dayWidth, labelWidth, rowHeight]
  );

  const contentHeight = headerHeight + datedTickets.length * rowHeight;
  const svgHeight = Math.max(contentHeight, containerHeight);
  const bodyHeight = svgHeight - headerHeight;
  const svgWidth = labelWidth + days.length * dayWidth;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Select value={String(displayMonth)} onValueChange={handleMonthChange}>
            <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i)} className="text-xs">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(displayYear)} onValueChange={handleYearChange}>
            <SelectTrigger className="h-8 w-[80px] text-xs"><SelectValue /></SelectTrigger>
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
          <Button variant="outline" size="sm" className="h-8" onClick={handleResetWeek}>Today</Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextWeek} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={chartContainerRef}
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border relative"
      >
        {datedTickets.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-2 text-center px-4">
              <CalendarDays className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">No work items with dates</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Set start or due dates on tickets to see them here. You can do this from the ticket detail, backlog table, or inline on the board.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {onCreateTicket && (
                <Button size="sm" variant="default" onClick={onCreateTicket}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Create Ticket with Dates
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={handleGoToBacklog}>
                <List className="h-3.5 w-3.5 mr-1.5" />
                Go to Backlog
              </Button>
            </div>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="min-w-max">
            <svg width={svgWidth} height={svgHeight} className="text-foreground">
            <rect x={0} y={0} width={labelWidth} height={headerHeight} className="fill-muted/50" />
            <text x={12} y={26} className="fill-muted-foreground text-xs" fontSize={12}>Work Item</text>

            {days.map((day, i) => {
              const x = labelWidth + i * dayWidth;
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const isToday = toDateStr(day) === today;
              return (
                <g key={i}>
                  {isWeekend && (
                    <rect x={x} y={headerHeight} width={dayWidth} height={bodyHeight} className="fill-muted/30" />
                  )}
                  {isToday && (
                    <rect x={x} y={headerHeight} width={dayWidth} height={bodyHeight} className="fill-primary/10" />
                  )}
                  <line x1={x} y1={0} x2={x} y2={svgHeight} className="stroke-border" strokeWidth={0.5} />
                  <text x={x + dayWidth / 2} y={16} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </text>
                  <text x={x + dayWidth / 2} y={32} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>
                    {day.getDate()}
                  </text>
                </g>
              );
            })}

            <line x1={labelWidth} y1={headerHeight} x2={svgWidth} y2={headerHeight} className="stroke-border" />

            {datedTickets.map((ticket) => {
              const geo = barGeometries.get(ticket.id);
              if (!geo) return null;
              const y = geo.y;
              const isCp = criticalPathIds.has(ticket.id);
              return (
                <g key={ticket.id} data-ticket-id={ticket.id} onClick={handleGanttRowClick} className="cursor-pointer">
                  <line x1={0} y1={y} x2={svgWidth} y2={y} className="stroke-border" strokeWidth={0.5} />
                  <text x={8} y={y + rowHeight / 2 + 4} className="fill-foreground" fontSize={labelWidth < 180 ? 9 : 11}>
                    {(ticket.sequenceId ?? `#${ticket.ticketNumber}`)} {ticket.title.slice(0, labelWidth < 180 ? 12 : 25)}{ticket.title.length > (labelWidth < 180 ? 12 : 25) ? "…" : ""}
                  </text>
                  {geo.visible && (
                    <rect
                      x={geo.x}
                      y={y + 6}
                      width={geo.width}
                      height={rowHeight - 12}
                      rx={4}
                      fill={getStatusHexColor(ticket.status)}
                      opacity={0.8}
                      {...(isCp ? { stroke: "#f87171", strokeWidth: 2 } : {})}
                    />
                  )}
                </g>
              );
            })}

            <GanttMilestoneMarkers
              milestones={milestones ?? []}
              startOfWeek={startOfWeek}
              numDays={numDays}
              dayWidth={dayWidth}
              labelWidth={labelWidth}
              totalHeight={svgHeight}
            />
            <GanttDependencyOverlay
              nodes={cpData?.criticalPath ?? []}
              rowMap={rowMap}
              geometries={barGeometries}
              rowHeight={rowHeight}
            />
          </svg>
          </div>
        </div>
      </div>

      {(cpData?.criticalPath.length ?? 0) > 0 && (
        <div className="flex shrink-0 items-center gap-2 px-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs text-red-600">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-400 border border-red-500" />
            Critical path
          </span>
        </div>
      )}
    </div>
  );
}
