"use client";

import {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
  type UIEvent,
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
import { useCriticalPath } from "@/hooks/api/build/reports";
import { useProjectMilestones } from "@/hooks/api/build/milestones";
import { computeBarGeometry } from "./gantt/gantt-geometry";
import { GanttTicketRows } from "./gantt/gantt-ticket-rows";
import { resolveGanttRowBand } from "./gantt/gantt-row-window";
import { GanttDependencyOverlay } from "./gantt/gantt-dependency-overlay";
import { GanttMilestoneMarkers } from "./gantt/gantt-milestone-markers";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PmPanel, PM_TOOLBAR } from "@/components/pm-chrome";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";

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

export function GanttView({
  tickets,
  projectId,
  onTicketClick,
  onCreateTicket,
}: GanttViewProps) {
  const resolution = usePageState({ permission: "build:view", isLoading: false, isError: false });
  const router = useRouter();
  const requestLeave = useNavigationLeave();
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
  const dayWidth = viewportWidth < 640 ? 32 : viewportWidth < 1024 ? 36 : 40;
  const rowHeight = 40;
  const headerHeight = 40;
  const labelWidth =
    viewportWidth < 640 ? 144 : viewportWidth < 1024 ? 192 : 240;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollViewportHeight, setScrollViewportHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const syncViewportHeight = () => {
      const next = el.clientHeight;
      setScrollViewportHeight((prev) =>
        Math.abs(prev - next) < 1 ? prev : next,
      );
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
    const diff = Math.round(
      (target.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
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

  const handleGoToBacklog = useCallback(() => {
    requestLeave(() => router.push(`/build/${projectId}/backlog`));
  }, [projectId, requestLeave, router]);

  const { data: cpData } = useCriticalPath(projectId);
  const { data: milestonesPage } = useProjectMilestones(projectId);
  const milestones = milestonesPage?.data;

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
    [
      datedTickets,
      rowMap,
      startOfWeek,
      numDays,
      dayWidth,
      labelWidth,
      rowHeight,
    ],
  );

  function handleTimelineScroll(event: UIEvent<HTMLDivElement>) {
    const next = event.currentTarget.scrollTop;
    setScrollTop((prev) => (Math.abs(prev - next) < rowHeight ? prev : next));
  }

  const rowBand = resolveGanttRowBand(
    datedTickets.length,
    scrollTop,
    scrollViewportHeight,
    headerHeight,
    rowHeight,
  );

  const contentHeight = headerHeight + datedTickets.length * rowHeight;
  const svgHeight = Math.max(contentHeight, scrollViewportHeight || 200);
  const bodyHeight = svgHeight - headerHeight;
  const svgWidth = labelWidth + days.length * dayWidth;
  const titleMax = labelWidth < 180 ? 12 : 25;

  return (
    <PageState resolution={resolution} loading={null}>
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className={cn(PM_TOOLBAR, "gap-2")}>
        <div className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
          <Select
            value={String(displayMonth)}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="w-40 shrink-0">
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
            <SelectTrigger className="w-28 shrink-0">
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
          <NavIconButton
            onClick={handlePrevWeek}
            ariaLabel="Previous week"
            direction="left"
          />
          <Button
            variant="outline"
            size="sm"
            className="px-2.5 text-xs"
            onClick={handleResetWeek}
          >
            Today
          </Button>
          <NavIconButton
            onClick={handleNextWeek}
            ariaLabel="Next week"
            direction="right"
          />
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
                  ? {
                      label: "Create Ticket with Dates",
                      onClick: onCreateTicket,
                    }
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

        <div
          ref={scrollRef}
          onScroll={handleTimelineScroll}
          className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]"
        >
          <div className="min-w-max">
            <svg
              width={svgWidth}
              height={svgHeight}
              className="text-foreground"
            >
              <rect
                x={0}
                y={0}
                width={labelWidth}
                height={headerHeight}
                className="fill-muted/40"
              />
              <text
                x={12}
                y={26}
                className="fill-muted-foreground text-xs"
                fontSize={12}
              >
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
                      fontSize={11}
                    >
                      {day.toLocaleDateString("en-IN", { weekday: "short" })}
                    </text>
                    <text
                      x={x + dayWidth / 2}
                      y={32}
                      textAnchor="middle"
                      className={
                        isToday ? "fill-primary" : "fill-muted-foreground"
                      }
                      fontSize={11}
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

              <GanttTicketRows
                tickets={datedTickets}
                band={rowBand}
                geometries={barGeometries}
                criticalPathIds={criticalPathIds}
                svgWidth={svgWidth}
                rowHeight={rowHeight}
                titleMax={titleMax}
                labelFontSize={11}
                onTicketClick={onTicketClick}
              />

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

      {(cpData?.criticalPath.length ?? 0) > 0 ||
      (milestones?.length ?? 0) > 0 ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 px-0.5">
          {(cpData?.criticalPath.length ?? 0) > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-status-danger-rule bg-status-danger-surface px-2.5 py-0.5 text-dense text-status-danger-ink-strong">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm border border-status-danger-rule bg-status-danger-fill"
                aria-hidden
              />
              Critical path
            </span>
          ) : null}
          {(milestones?.length ?? 0) > 0 ? (
            <span
              className={cn(TEXT_ONE_LINE, "text-dense text-muted-foreground")}
            >
              Diamonds mark project milestones
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
    </PageState>
  );
}
