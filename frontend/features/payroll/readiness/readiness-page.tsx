"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthPicker } from "@/features/payroll/shared/month-picker";
import { formatMonth } from "@/features/payroll/shared/payroll-format";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { usePayrollReadiness, usePayrollRunBlockers, READINESS_PAGE_LIMIT } from "@/hooks/api/payroll/readiness";
import { useRunEmployees } from "@/hooks/api/payroll/run-employees";
import { currentPayrollMonth } from "@/hooks/api/payroll/payroll-cutoff";
import { formatDateTime } from "@/lib/date-utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import {
  blockedPeopleCount,
  countsByCategory,
  openBlockerCount,
  readinessBlockerRows,
  waivedCount,
} from "./readiness-blockers";
import { ReadinessBlockersTable } from "./readiness-blockers-table";
import type { ReadinessCategoryKey } from "./readiness-categories";
import { ReadinessExports } from "./readiness-exports";
import { ReadinessHeader } from "./readiness-header";
import { ReadinessStageList } from "./readiness-stage-list";
import { summariseCycle } from "./readiness-summary";
import { ReadinessTiles, ReadinessTilesSkeleton } from "./readiness-tiles";

function ReadinessSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Skeleton className="h-36 rounded-xl" />
      <ReadinessTilesSkeleton />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export function PayrollReadinessPage() {
  const [month, setMonth] = useState(currentPayrollMonth);
  const [activeCategory, setActiveCategory] = useState<ReadinessCategoryKey | null>(null);

  const readiness = usePayrollReadiness(month);
  const runId = readiness.data?.run?.id ?? null;
  const runBlockers = usePayrollRunBlockers(month, runId);
  const roster = useRunEmployees(runId ?? 0, { limit: READINESS_PAGE_LIMIT });

  const canStartRun = useCan("payroll:runs:create");

  const isLoading = readiness.isLoading || runBlockers.isLoading || roster.isLoading;
  const hardError = readiness.isError && readiness.data === undefined;
  const isStale =
    readiness.data !== undefined && (readiness.isError || runBlockers.isError || roster.isError);

  const pageState = usePageState({
    permission: "payroll:runs:view",
    module: "payroll",
    isLoading,
    isError: hardError,
    error: readiness.error,
  });

  const handleRetry = useCallback(() => {
    void readiness.refetch();
    void runBlockers.refetch();
    void roster.refetch();
  }, [readiness, runBlockers, roster]);

  const handleMonthChange = useCallback((next: string) => {
    setMonth(next);
    setActiveCategory(null);
  }, []);

  const handleSelectCategory = useCallback((key: ReadinessCategoryKey) => {
    setActiveCategory((current) => (current === key ? null : key));
  }, []);

  const handleClearFilter = useCallback(() => {
    setActiveCategory(null);
  }, []);

  const rows = useMemo(
    () => readinessBlockerRows(readiness.data, runBlockers.data?.data),
    [readiness.data, runBlockers.data],
  );

  const visibleRows = useMemo(
    () => (activeCategory === null ? rows : rows.filter((row) => row.categoryKey === activeCategory)),
    [rows, activeCategory],
  );

  const summary = useMemo(
    () =>
      summariseCycle({
        isLoading,
        isStale,
        blockers: openBlockerCount(rows),
        blockedPeople: blockedPeopleCount(rows),
        waived: waivedCount(rows),
        population: {
          inCycle: roster.data?.data.length ?? 0,
          isComplete: runId !== null && roster.data !== undefined && !roster.data.pagination.hasMore,
        },
      }),
    [isLoading, isStale, rows, roster.data, runId],
  );

  const counts = useMemo(() => countsByCategory(rows), [rows]);
  const staleTone = statusToneClasses("warning");

  return (
    <PageWrapper
      variant="display"
      title="Payroll readiness"
      subtitle={formatMonth(month)}
      actions={<MonthPicker value={month} onChange={handleMonthChange} yearRange={[-2, 0]} className="w-44" />}
    >
      <PageState resolution={pageState} loading={<ReadinessSkeleton />} onRetry={handleRetry} className="flex-1">
        {readiness.data ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            {isStale ? (
              <div
                role="status"
                aria-label="Readiness is out of date"
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-3",
                  staleTone.surface,
                  staleTone.rule,
                )}
              >
                <AlertTriangle className={cn("mt-0.5 h-4 w-4 shrink-0", staleTone.ink)} aria-hidden />
                <p className={cn("text-dense leading-snug", staleTone.inkStrong)}>
                  This refresh failed, so the board is out of date. Last good read{" "}
                  {readiness.dataUpdatedAt ? formatDateTime(new Date(readiness.dataUpdatedAt).toISOString()) : "unknown"}.
                </p>
              </div>
            ) : null}
            <ReadinessHeader
              summary={summary}
              cutoff={readiness.data.cutoff}
              updatedAt={readiness.dataUpdatedAt || null}
              canStartRun={canStartRun}
              runId={runId}
            />
            {readiness.data.cutoff === null ? (
              <EmptyState
                compact
                illustrationPreset="calendar"
                title="This cycle has no cut-off date"
                description="Readiness is measured against a pay cycle. Add the month's cut-off in the payroll calendar to date this board."
                action={{ label: "Open payroll calendar", href: "/payroll/calendar" }}
              />
            ) : null}
            <ReadinessTiles
              counts={counts}
              runBlockersAvailable={runId !== null && runBlockers.data !== undefined}
              activeCategory={activeCategory}
              onSelect={handleSelectCategory}
            />
            <ReadinessBlockersTable
              rows={visibleRows}
              activeCategory={activeCategory}
              onClearFilter={handleClearFilter}
              truncated={runBlockers.data?.pagination.hasMore ?? false}
            />
            <ReadinessStageList stages={readiness.data.stages} />
            <ReadinessExports exports={readiness.data.exports} />
          </div>
        ) : null}
      </PageState>
    </PageWrapper>
  );
}
