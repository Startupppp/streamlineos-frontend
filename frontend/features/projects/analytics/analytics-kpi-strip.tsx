"use client";

import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ProjectAnalytics } from "@/types/projects";
import { PM_PANEL } from "@/features/projects/shared/pm-chrome";
import { TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}

const KpiCard = memo(function KpiCard({ label, value, sub, accent }: KpiCardProps) {
  return (
    <div className={cn(PM_PANEL, "flex min-w-0 flex-col gap-0.5 px-4 py-3")}>
      <span className={cn("text-[11px] font-medium leading-none text-muted-foreground", TEXT_ONE_LINE)}>
        {label}
      </span>
      <span
        className={cn(
          "text-2xl font-bold tabular-nums leading-tight tracking-tight",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
      {sub ? (
        <span className={cn("text-[11px] leading-none text-muted-foreground", TEXT_ONE_LINE)}>
          {sub}
        </span>
      ) : null}
    </div>
  );
});

interface AnalyticsKpiStripProps {
  analytics: ProjectAnalytics;
}

export const AnalyticsKpiStrip = memo(function AnalyticsKpiStrip({
  analytics,
}: AnalyticsKpiStripProps) {
  const breakdown = analytics.healthBreakdown;

  const totalTickets = breakdown?.totalTickets ?? 0;
  const overdueTickets = breakdown?.overdueTickets ?? 0;

  const doneCount = analytics.stateDistribution.reduce(
    (acc, row) => (row.status?.toLowerCase() === "done" ? acc + row.count : acc),
    0,
  );
  const openCount = analytics.stateDistribution.reduce(
    (acc, row) =>
      row.status?.toLowerCase() !== "done" && row.status?.toLowerCase() !== "cancelled"
        ? acc + row.count
        : acc,
    0,
  );
  const derivedTotal =
    totalTickets > 0
      ? totalTickets
      : analytics.stateDistribution.reduce((acc, row) => acc + row.count, 0);

  const completionPct =
    breakdown?.completionPct != null
      ? breakdown.completionPct
      : derivedTotal > 0
        ? Math.round((doneCount / derivedTotal) * 100)
        : 0;

  const onTimePct = breakdown?.onTimePct ?? null;
  const velocityScore = breakdown?.velocityScore ?? null;

  const avgVelocity =
    analytics.cycleVelocity.length > 0
      ? Math.round(
          analytics.cycleVelocity.reduce((acc, v) => acc + v.completedPoints, 0) /
            analytics.cycleVelocity.length,
        )
      : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
      <KpiCard label="Total tickets" value={derivedTotal} />
      <KpiCard label="Open" value={openCount} />
      <KpiCard label="Completed" value={doneCount} />
      <KpiCard label="Completion rate" value={`${completionPct}%`} accent />
      {onTimePct != null && (
        <KpiCard label="On-time rate" value={`${onTimePct}%`} />
      )}
      {overdueTickets > 0 && (
        <KpiCard
          label="Overdue"
          value={overdueTickets}
          sub="tickets past due"
          accent={overdueTickets > 0}
        />
      )}
      {avgVelocity != null && (
        <KpiCard label="Avg velocity" value={avgVelocity} sub="pts / cycle" />
      )}
      {velocityScore != null && avgVelocity == null && (
        <KpiCard label="Velocity score" value={`${velocityScore}%`} />
      )}
    </div>
  );
});

export function AnalyticsKpiStripSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
      ))}
    </div>
  );
}
