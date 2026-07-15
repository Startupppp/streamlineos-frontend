"use client";
import { useCallback, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Send, RotateCcw, Loader2, X } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { useCurrentPeriod, useSubmitPeriod, useRecallPeriod, useTimesheetEntries } from "@/hooks/api/timesheets-core";
import { PERIOD_STATUS_BADGE, PERIOD_STATUS_LABEL } from "@/features/timesheets-core";
import { useWeek } from "./use-week";
import { TimerPanel } from "./timer-panel";
import { WeekGrid } from "./week-grid";
import { DayTimeline } from "./day-timeline";
import { cn } from "@/lib/utils";

export function MyTimeView() {
  const { weekStart, weekEnd, days, isCurrentWeek, goToPrev, goToNext, goToCurrent } = useWeek();
  const shouldReduceMotion = useReducedMotion();
  const [rejectionDismissed, setRejectionDismissed] = useState(false);

  const { data: periodDetail, isLoading: periodLoading, isError: periodError, refetch: refetchPeriod } = useCurrentPeriod();
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

  const motionProps = shouldReduceMotion
    ? {}
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.22, ease: "easeOut" as const } };

  const periodBadge = period ? (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium border", PERIOD_STATUS_BADGE[period.status])}>
      {PERIOD_STATUS_LABEL[period.status]}
    </span>
  ) : null;

  const weekNavActions = (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-md border border-border overflow-hidden">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none border-r border-border" onClick={goToPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          className={cn("h-8 px-3 text-xs rounded-none", isCurrentWeek && "text-blue-600 font-medium")}
          onClick={goToCurrent}
        >
          This week
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none border-l border-border" onClick={goToNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {canRecall ? (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={handleRecall}
          disabled={recallPeriod.isPending}
        >
          {recallPeriod.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          Recall
        </Button>
      ) : (
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={handleSubmit}
          disabled={!canSubmit || submitPeriod.isPending}
        >
          {submitPeriod.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Submit week
        </Button>
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
      <motion.div {...motionProps} className="space-y-4">
        {periodError && (
          <ErrorState
            title="Couldn't load period"
            description="Failed to load your current timesheet period."
            onRetry={handlePeriodRetry}
            compact
          />
        )}

        {period?.status === "REJECTED" && !rejectionDismissed && isCurrentWeek && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50/60 dark:bg-red-500/10 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Timesheet rejected</p>
              {period.rejectionReason && (
                <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">{period.rejectionReason}</p>
              )}
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">Update your entries and resubmit.</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-500/10 shrink-0"
              onClick={handleDismissRejection}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {periodLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : (
          <Tabs defaultValue="week">
            <TabsList className="h-8">
              <TabsTrigger value="timer" className="text-xs h-8">Timer</TabsTrigger>
              <TabsTrigger value="week" className="text-xs h-8">Week</TabsTrigger>
              <TabsTrigger value="day" className="text-xs h-8">Day</TabsTrigger>
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
