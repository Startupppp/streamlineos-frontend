"use client";

import {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
  type MouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeftIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import { getStatusHexColor } from "../shared/status-badge";
import { useCriticalPath } from "@/hooks/api/build/reports";
import { useProjectMilestones } from "@/hooks/api/build/milestones";
import { computeBarGeometry } from "./gantt/gantt-geometry";
import { GanttDependencyOverlay } from "./gantt/gantt-dependency-overlay";
import { GanttMilestoneMarkers } from "./gantt/gantt-milestone-markers";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PmPanel, PM_TOOLBAR } from "@/features/build/shared/pm-chrome";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";

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
  assignee?: {
    id: string;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
}

interface GanttViewProps {
  tickets: Ticket[];
  projectId: number;
  onTicketClick: (ticketId: number) => void;
  onCreateTicket?: () => void;
}

function NavIconButton({
  onClick,
  ariaLabel,
  direction,
}: {
  onClick: () => void;
  ariaLabel: string;
  direction: "left" | "right";
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const Icon = direction === "left" ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <Button
      variant="outline"
      size="icon"
      className="shrink-0"
      onClick={onClick}
      aria-label={ariaLabel}
      {...hoverHandlers}
    >
      <Icon ref={iconRef} size={14} />
    </Button>
  );
}

export function GanttView({ tickets, projectId, onTicketClick, onCreateTicket }: GanttViewProps) {
  const router = useRouter();
  const [weekOffset, setWeekOffset] = useState(0);

  const datedTickets = useMemo(
    () => tickets.filter((t) => t.startDate || t.dueDate),
    [tickets],
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollViewportHeight, setScrollViewportHeight] = useState(0);

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
    [displayYear, jumpToMonth],
  );
  const handleYearChange = useCallback(
    (v: string) => jumpToMonth(parseInt(v, 10), displayMonth),
    [displayMonth, jumpToMonth],
  );
  const handlePrevWeek = useCallback(() => setWeekOffset((w) => w - 1), []);
  const handleResetWeek = useCallback(() => setWeekOffset(0), []);
  const handleNextWeek = useCallback(() => setWeekOffset((w) => w + 1), []);
  const handleGanttRowClick = useCallback(
    (e: MouseEvent<SVGGElement>) => {
      const id = Number(e.currentTarget.dataset.ticketId);
      if (id) onTicketClick(id);
    },
    [onTicketClick],
  );

  const handleGoToBacklog = useCallback(() => {
    router.push(`/build/${projectId}/backlog`);
  }, [router, projectId]);

  const { data: cpData } = useCriticalPath(projectId);
  const { data: milestones } = useProjectMilestones(projectId);

  const criticalPathIds = useMemo(
    () => new Set((cpData?.criticalPath ?? []).map((n) => n.ticketId)),
    [cpData],
  );

  const rowMap = useMemo<Map<number, number>>(
    () => new Map(datedTickets.map((t, i): [number, number] => [t.id, i])),
    [datedTickets],
  );

  const barGeometries = useMemo(
    () =>
      new Map(
        datedTickets.map((t) => [
          t.id,
          computeBarGeometry(
            t.startDate,
            t.dueDate,
            rowMap.get(t.id) ?? 0,
            startOfWeek,
            numDays,
            dayWidth,
            labelWidth,
            rowHeight,
          ),
        ]),
      ),
    [datedTickets, rowMap, startOfWeek, numDays, dayWidth, labelWidth, rowHeight],
  );

  const contentHeight = headerHeight + datedTickets.length * rowHeight;
  const svgHeight = Math.max(contentHeight, scrollViewportHeight || 200);
  const bodyHeight = svgHeight - headerHeight;
  const svgWidth = labelWidth + days.length * dayWidth;
  const titleMax = labelWidth < 180 ? 12 : 25;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className={cn(PM_TOOLBAR, "gap-2")}>
        <div className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
          <Select value={String(displayMonth)} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[120px] shrink-0">
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
            <SelectTrigger className="w-[80px] shrink-0">
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
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <NavIconButton onClick={handlePrevWeek} ariaLabel="Previous week" direction="left" />
          <Button
            variant="outline"
            size="sm"
            className="px-2.5 text-xs"
            onClick={handleResetWeek}
          >
            Today
          </Button>
          <NavIconButton onClick={handleNextWeek} ariaLabel="Next week" direction="right" />
        </div>
      </div>

      <PmPanel className="relative flex min-h-0 flex-1 flex-col">
        {datedTickets.length === 0 ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
            <EmptyState
              illustrationPreset="projects"
              title="No work items with dates"
              description="Set start or due dates on tickets to plot them on the timeline. You can do this from ticket detail, the backlog table, or inline on the board."
              action={
                onCreateTicket
                  ? { label: "Create Ticket with Dates", onClick: onCreateTicket }
                  : { label: "Go to Backlog", onClick: handleGoToBacklog }
              }
              secondaryAction={
                onCreateTicket
                  ? { label: "Go to Backlog", onClick: handleGoToBacklog }
                  : undefined
              }
              className={CONTENT_FILL_PANEL}
            />
          </div>
        ) : null}

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
          <div className="min-w-max">
            <svg width={svgWidth} height={svgHeight} className="text-foreground">
              <rect x={0} y={0} width={labelWidth} height={headerHeight} className="fill-muted/40" />
              <text x={12} y={26} className="fill-muted-foreground text-xs" fontSize={12}>
                Work Item
              </text>

              {days.map((day, i) => {
                const x = labelWidth + i * dayWidth;
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const isToday = toDateStr(day) === today;
                return (
                  <g key={i}>
                    {isWeekend ? (
                      <rect
                        x={x}
                        y={headerHeight}
                        width={dayWidth}
                        height={bodyHeight}
                        className="fill-muted/25"
                      />
                    ) : null}
                    {isToday ? (
                      <rect
                        x={x}
                        y={headerHeight}
                        width={dayWidth}
                        height={bodyHeight}
                        className="fill-primary/10"
                      />
                    ) : null}
                    <line
                      x1={x}
                      y1={0}
                      x2={x}
                      y2={svgHeight}
                      className="stroke-border/70"
                      strokeWidth={0.5}
                    />
                    <text
                      x={x + dayWidth / 2}
                      y={16}
                      textAnchor="middle"
                      className="fill-muted-foreground"
                      fontSize={10}
                    >
                      {day.toLocaleDateString("en-IN", { weekday: "short" })}
                    </text>
                    <text
                      x={x + dayWidth / 2}
                      y={32}
                      textAnchor="middle"
                      className={isToday ? "fill-primary" : "fill-muted-foreground"}
                      fontSize={10}
                      fontWeight={isToday ? 600 : 400}
                    >
                      {day.getDate()}
                    </text>
                  </g>
                );
              })}

              <line
                x1={labelWidth}
                y1={headerHeight}
                x2={svgWidth}
                y2={headerHeight}
                className="stroke-border/80"
              />

              {datedTickets.map((ticket) => {
                const geo = barGeometries.get(ticket.id);
                if (!geo) return null;
                const y = geo.y;
                const isCp = criticalPathIds.has(ticket.id);
                const label = ticket.sequenceId ?? `#${ticket.ticketNumber ?? ticket.id}`;
                const shortTitle =
                  ticket.title.length > titleMax
                    ? `${ticket.title.slice(0, titleMax)}…`
                    : ticket.title;
                return (
                  <g
                    key={ticket.id}
                    data-ticket-id={ticket.id}
                    onClick={handleGanttRowClick}
                    className="cursor-pointer"
                  >
                    <title>{`${label} ${ticket.title}`}</title>
                    <rect
                      x={0}
                      y={y}
                      width={svgWidth}
                      height={rowHeight}
                      className="fill-transparent hover:fill-primary/[0.03]"
                    />
                    <line
                      x1={0}
                      y1={y}
                      x2={svgWidth}
                      y2={y}
                      className="stroke-border/50"
                      strokeWidth={0.5}
                    />
                    <text
                      x={8}
                      y={y + rowHeight / 2 + 4}
                      className="fill-foreground"
                      fontSize={labelWidth < 180 ? 9 : 11}
                    >
                      {`${label} ${shortTitle}`}
                    </text>
                    {geo.visible ? (
                      <rect
                        x={geo.x}
                        y={y + 6}
                        width={geo.width}
                        height={rowHeight - 12}
                        rx={4}
                        fill={getStatusHexColor(ticket.status)}
                        opacity={0.85}
                        {...(isCp ? { stroke: "var(--destructive)", strokeWidth: 2 } : {})}
                      />
                    ) : null}
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
      </PmPanel>

      {(cpData?.criticalPath.length ?? 0) > 0 || (milestones?.length ?? 0) > 0 ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 px-0.5">
          {(cpData?.criticalPath.length ?? 0) > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm border border-red-500 bg-red-400"
                aria-hidden
              />
              Critical path
            </span>
          ) : null}
          {(milestones?.length ?? 0) > 0 ? (
            <span className={cn(TEXT_ONE_LINE, "text-[11px] text-muted-foreground")}>
              Diamonds mark project milestones
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
