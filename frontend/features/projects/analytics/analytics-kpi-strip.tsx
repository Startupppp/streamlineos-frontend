"use client";

import { memo } from "react";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import type { ProjectAnalytics } from "@/types/projects";

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
    <StatCardGrid cols={6} className="mb-4">
      <StatCard label="Total tickets" value={derivedTotal} />
      <StatCard label="Open" value={openCount} />
      <StatCard label="Completed" value={doneCount} tone="emerald" />
      <StatCard label="Completion rate" value={`${completionPct}%`} tone="blue" />
      {onTimePct != null && <StatCard label="On-time rate" value={`${onTimePct}%`} tone="blue" />}
      {overdueTickets > 0 && (
        <StatCard
          label="Overdue"
          value={overdueTickets}
          hint="tickets past due"
          tone="red"
        />
      )}
      {avgVelocity != null && (
        <StatCard label="Avg velocity" value={avgVelocity} hint="pts / cycle" tone="amber" />
      )}
      {velocityScore != null && avgVelocity == null && (
        <StatCard label="Velocity score" value={`${velocityScore}%`} tone="amber" />
      )}
    </StatCardGrid>
  );
});

export function AnalyticsKpiStripSkeleton() {
  return <StatCardGridSkeleton cols={6} className="mb-4" />;
}
