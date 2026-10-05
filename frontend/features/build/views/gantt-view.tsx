"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { computeBarGeometry } from "./gantt/gantt-geometry";
import { GanttTicketRows } from "./gantt/gantt-ticket-rows";
import { resolveGanttRowBand } from "./gantt/gantt-row-window";
import { GanttDependencyOverlay } from "./gantt/gantt-dependency-overlay";
import { GanttMilestoneMarkers } from "./gantt/gantt-milestone-markers";
import { GanttToolbar } from "./gantt/gantt-toolbar";
import { GanttLegend } from "./gantt/gantt-legend";
import { useGanttViewport } from "./gantt/use-gantt-viewport";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { PmPanel } from "@/components/pm-chrome";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useCriticalPath } from "@/hooks/api/build/reports";
import { useProjectMilestones } from "@/hooks/api/build/milestones";

const GANTT_MAX_DAYS = 28;

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

export function GanttView({ tickets, projectId, onTicketClick, onCreateTicket }: GanttViewProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const startOfWeek = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + weekOffset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [weekOffset]);

  const milestoneWindow = useMemo(() => {
    const end = new Date(startOfWeek);
    end.setDate(end.getDate() + GANTT_MAX_DAYS);
    return {
      from: startOfWeek.toISOString().split("T")[0] ?? "",
      to: end.toISOString().split("T")[0] ?? "",
    };
  }, [startOfWeek]);

  const { data: cpData, isLoading: cpLoading, isError: cpIsError, error: cpError } = useCriticalPath(projectId);
  const { data: milestonesPage, isLoading: milestonesLoading, isError: milestonesIsError, error: milestonesError } = useProjectMilestones(projectId, milestoneWindow);

  const resolution = usePageState({
    permission: "build:view",
    isLoading: cpLoading || milestonesLoading,
    isError: cpIsError || milestonesIsError,
    error: cpError ?? milestonesError,
  });

  const router = useRouter();
  const requestLeave = useNavigationLeave();

  const {
    numDays, dayWidth, rowHeight, headerHeight, labelWidth,
    scrollRef, scrollViewportHeight, scrollTop, handleTimelineScroll,
  } = useGanttViewport();

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
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const handleMonthChange = useCallback((v: string) => jumpToMonth(displayYear, parseInt(v, 10)), [displayYear, jumpToMonth]);
  const handleYearChange = useCallback((v: string) => jumpToMonth(parseInt(v, 10), displayMonth), [displayMonth, jumpToMonth]);
  const handlePrevWeek = useCallback(() => setWeekOffset((w) => w - 1), []);
  const handleResetWeek = useCallback(() => setWeekOffset(0), []);
  const handleNextWeek = useCallback(() => setWeekOffset((w) => w + 1), []);
  const handleGoToBacklog = useCallback(() => {
    requestLeave(() => router.push(`/build/${projectId}/backlog`));
  }, [projectId, requestLeave, router]);

  const milestones = milestonesPage?.data;
  const criticalPathIds = useMemo(() => new Set((cpData?.criticalPath ?? []).map((n) => n.ticketId)), [cpData]);
  const rowMap = useMemo<Map<number, number>>(() => new Map(tickets.map((t, i): [number, number] => [t.id, i])), [tickets]);

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

  const barGeometries = useMemo(
    () => new Map(tickets.map((t) => [t.id, computeBarGeometry(t.startDate, t.dueDate, rowMap.get(t.id) ?? 0, startOfWeek, numDays, dayWidth, labelWidth, rowHeight)])),
    [tickets, rowMap, startOfWeek, numDays, dayWidth, labelWidth, rowHeight],
  );

  const rowBand = resolveGanttRowBand(tickets.length, scrollTop, scrollViewportHeight, headerHeight, rowHeight);
  const contentHeight = headerHeight + tickets.length * rowHeight;
  const svgHeight = Math.max(contentHeight, scrollViewportHeight || 200);
  const bodyHeight = svgHeight - headerHeight;
  const svgWidth = labelWidth + days.length * dayWidth;
  const titleMax = labelWidth < 180 ? 12 : 25;

  return (
    <PageState resolution={resolution} loading={null}>
    <div className="flex h-full min-h-0 flex-col gap-3">
      <GanttToolbar
        displayMonth={displayMonth}
        displayYear={displayYear}
        yearOptions={yearOptions}
        onMonthChange={handleMonthChange}
        onYearChange={handleYearChange}
        onPrevWeek={handlePrevWeek}
        onResetWeek={handleResetWeek}
        onNextWeek={handleNextWeek}
      />

      <PmPanel className="relative flex min-h-0 flex-1 flex-col">
        {tickets.length === 0 ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
            <EmptyState
              illustrationPreset="calendar"
              title="No work items with dates"
              description="Set start or due dates on tickets to plot them on the timeline. You can do this from ticket detail, the backlog table, or inline on the board."
              action={
                onCreateTicket
                  ? { label: "Create Ticket with Dates", onClick: onCreateTicket }
                  : { label: "Go to Backlog", onClick: handleGoToBacklog }
              }
              secondaryAction={onCreateTicket ? { label: "Go to Backlog", onClick: handleGoToBacklog } : undefined}
              className={CONTENT_FILL_PANEL}
            />
          </div>
        ) : null}

        <div ref={scrollRef} onScroll={handleTimelineScroll} className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
          <div className="min-w-max">
            <svg width={svgWidth} height={svgHeight} className="text-foreground">
              <rect x={0} y={0} width={labelWidth} height={headerHeight} className="fill-muted/40" />
              <text x={12} y={26} className="fill-muted-foreground text-xs" fontSize={12}>Work Item</text>

              {days.map((day, i) => {
                const x = labelWidth + i * dayWidth;
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const isToday = toDateStr(day) === today;
                return (
                  <g key={i}>
                    {isWeekend ? <rect x={x} y={headerHeight} width={dayWidth} height={bodyHeight} className="fill-muted/25" /> : null}
                    {isToday ? <rect x={x} y={headerHeight} width={dayWidth} height={bodyHeight} className="fill-primary/10" /> : null}
                    <line x1={x} y1={0} x2={x} y2={svgHeight} className="stroke-border/70" strokeWidth={0.5} />
                    <text x={x + dayWidth / 2} y={16} textAnchor="middle" className="fill-muted-foreground" fontSize={11}>
                      {day.toLocaleDateString("en-IN", { weekday: "short" })}
                    </text>
                    <text x={x + dayWidth / 2} y={32} textAnchor="middle" className={isToday ? "fill-primary" : "fill-muted-foreground"} fontSize={11} fontWeight={isToday ? 500 : 400}>
                      {day.getDate()}
                    </text>
                  </g>
                );
              })}

              <line x1={labelWidth} y1={headerHeight} x2={svgWidth} y2={headerHeight} className="stroke-border/80" />

              <GanttTicketRows
                tickets={tickets}
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

      <GanttLegend
        hasCriticalPath={(cpData?.criticalPath.length ?? 0) > 0}
        hasMilestones={(milestones?.length ?? 0) > 0}
      />
    </div>
    </PageState>
  );
}
