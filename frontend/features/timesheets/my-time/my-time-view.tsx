"use client";
import { useCallback, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "@animateicons/react/lucide";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { AiActionsMenu, type AiAction } from "@/components/ai";
import { useCurrentPeriod, useSubmitPeriod, useRecallPeriod, useTimesheetEntries, fetchTimesheetPeriodSummary } from "@/hooks/api/timesheets-core";
import { PERIOD_STATUS_BADGE, PERIOD_STATUS_LABEL } from "@/features/timesheets";
import { useWeek, type WeekStartDay } from "./use-week";
import { TimerPanel } from "./timer-panel";
import { WeekGrid } from "./week-grid";
import { DayTimeline } from "./day-timeline";
import { cn } from "@/lib/utils";

const WEEK_START_DAYS: readonly WeekStartDay[] = [0, 1, 2, 3, 4, 5, 6];

export function MyTimeView() {
  const shouldReduceMotion = useReducedMotion();
  const [rejectionDismissed, setRejectionDismissed] = useState(false);

  const { data: periodDetail, isLoading: periodLoading, isError: periodError, refetch: refetchPeriod } = useCurrentPeriod();

  const weekStartsOn = useMemo<WeekStartDay>(() => {
    const start = periodDetail?.period?.periodStart;
    if (!start) return 1;
    const dow = parseISO(start).getDay();
    return WEEK_START_DAYS.find((d) => d === dow) ?? 1;
  }, [periodDetail?.period?.periodStart]);

  const { weekStart, weekEnd, days, isCurrentWeek, goToPrev, goToNext, goToCurrent } = useWeek(weekStartsOn);
  const { data: entriesData, isLoading: entriesLoading } = useTimesheetEntries(
    { startDate: weekStart, endDate: weekEnd },
    true,
  );

  const submitPeriod = useSubmitPeriod();
  const recallPeriod = useRecallPeriod();

  const period = periodDetail?.period;
  const entries = useMemo(() => entriesData ?? [], [entriesData]);

  const totalHours = useMemo(
    () => entries.reduce((sum, e) => sum + Number(e.hours), 0),
    [entries],
  );

  const subtitle = useMemo(() => {
    const s = parseISO(weekStart);
    const e = parseISO(weekEnd);
    const label = `${format(s, "MMM d")}–${format(e, "d")} · ${totalHours.toFixed(1)}h`;
    return label;
  }, [weekStart, weekEnd, totalHours]);

  const canSubmit =
    isCurrentWeek &&
    !!period &&
    (period.status === "OPEN" || period.status === "DRAFT" || period.status === "REJECTED");
  const canRecall = isCurrentWeek && period?.status === "SUBMITTED";

  const handleSubmit = useCallback(() => {
    if (!period) return;
    submitPeriod.mutate(period.id);
  }, [period, submitPeriod]);

  const handleRecall = useCallback(() => {
    if (!period) return;
    recallPeriod.mutate(period.id);
  }, [period, recallPeriod]);

  const handlePeriodRetry = useCallback(() => { void refetchPeriod(); }, [refetchPeriod]);
  const handleDismissRejection = useCallback(() => setRejectionDismissed(true), []);

  const aiActions = useMemo<AiAction[]>(() => {
    if (!period) return [];
    const periodId = period.id;
    return [
      {
        key: "summarize-period",
        label: "Summarize this timesheet",
        description: "Narrate hours by project, billable ratio, and notable patterns",
        run: async () => {
          const res = await fetchTimesheetPeriodSummary(periodId);
          return { text: res.narration };
        },
      },
    ];
  }, [period]);

  const motionProps = shouldReduceMotion
    ? {}
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.22, ease: "easeOut" as const } };

  const periodBadge = period ? (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-md text-dense font-medium border", PERIOD_STATUS_BADGE[period.status])}>
      {PERIOD_STATUS_LABEL[period.status]}
    </span>
  ) : null;

  const weekNavActions = (
    <div className="flex items-center gap-2">
      <AiActionsMenu
        actions={aiActions}
        disabled={!period}
        menuLabel="Timesheet AI"
        align="end"
      />

      <div className="flex items-center rounded-md border border-border overflow-hidden">
        <AnimatedIconButton
          icon={ChevronLeftIcon}
          iconSize={16}
          variant="ghost"
          size="icon"
          className="rounded-none border-r border-border"
          onClick={goToPrev}
        />
        <Button
          variant="ghost"
          className={cn("px-3 rounded-none", isCurrentWeek && "text-primary font-medium")}
          onClick={goToCurrent}
        >
          This week
        </Button>
        <AnimatedIconButton
          icon={ChevronRightIcon}
          iconSize={16}
          variant="ghost"
          size="icon"
          className="rounded-none border-l border-border"
          onClick={goToNext}
        />
      </div>

      {canRecall ? (
        <LoadingButton
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleRecall}
          isPending={recallPeriod.isPending}
        >
          Recall
        </LoadingButton>
      ) : (
        <LoadingButton
          size="sm"
          className="gap-1.5"
          onClick={handleSubmit}
          isPending={submitPeriod.isPending}
          disabled={!canSubmit}
        >
          Submit week
        </LoadingButton>
      )}
    </div>
  );

  return (
    <PageWrapper
      title="My Time"
      subtitle={subtitle}
      badge={periodBadge}
      actions={weekNavActions}
    >
      <motion.div {...motionProps} className="flex flex-1 min-h-0 flex-col gap-4">
        {periodError && (
          <ErrorState
            title="Couldn't load period"
            description="Failed to load your current timesheet period."
            onRetry={handlePeriodRetry}
            compact
          />
        )}

        {period?.status === "REJECTED" && !rejectionDismissed && isCurrentWeek && (
          <div className="flex items-start gap-3 rounded-lg border border-status-danger-rule bg-status-danger-surface px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-status-danger-ink">Timesheet rejected</p>
              {period.rejectionReason && (
                <p className="text-xs text-status-danger-ink mt-0.5">{period.rejectionReason}</p>
              )}
              <p className="text-xs text-status-danger-ink mt-1">Update your entries and resubmit.</p>
            </div>
            <AnimatedIconButton
              icon={XIcon}
              iconSize={14}
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
              onClick={handleDismissRejection}
            />
          </div>
        )}

        {periodLoading ? (
          <div className="space-y-4">
            <div className="flex gap-1">
              <Skeleton className="h-9 w-16 rounded-md" />
              <Skeleton className="h-9 w-16 rounded-md" />
              <Skeleton className="h-9 w-16 rounded-md" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        ) : (
          <Tabs defaultValue="week">
            <TabsList>
              <TabsTrigger value="timer">Timer</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="day">Day</TabsTrigger>
            </TabsList>

            <TabsContent value="timer" className="mt-4">
              <TimerPanel weekStart={weekStart} weekEnd={weekEnd} />
            </TabsContent>

            <TabsContent value="week" className="mt-4">
              <WeekGrid
                entries={entriesData}
                isLoading={entriesLoading}
                days={days}
                weekStart={weekStart}
                weekEnd={weekEnd}
              />
            </TabsContent>

            <TabsContent value="day" className="mt-4">
              <DayTimeline entries={entriesData} days={days} />
            </TabsContent>
          </Tabs>
        )}
      </motion.div>
    </PageWrapper>
  );
}
