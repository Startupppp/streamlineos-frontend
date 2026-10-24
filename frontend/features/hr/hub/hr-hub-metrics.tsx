"use client";

import {
  Users,
  UserCheck,
  TrendingDown,
  ClipboardList,
  BarChart2,
  Inbox,
} from "lucide-react";
import {
  StatCard,
  StatCardGrid,
  StatCardGridSkeleton,
} from "@/components/ui/stat-card";
import { hubSectionData, hubSectionError } from "@/hooks/api/hr/hub";
import type { HrHubViewProps } from "@/hooks/api/hr/hub-types";
import { ErrorRetry } from "./today/today-card";

export function HrHubMetrics({
  access,
  snapshot,
  isLoading,
  onRetry,
}: HrHubViewProps) {
  const section = snapshot?.sections.commandCenter;
  const data = hubSectionData(section);
  const error = hubSectionError(section);

  if (isLoading) return <StatCardGridSkeleton cols={6} count={6} />;

  if (!access.canAnalytics) return null;
  if (error) return <ErrorRetry error={error} onRetry={onRetry} />;
  if (!data) return null;

  const { headcount, attritionRate, attendanceRatePct, leaveUtilizationPct, openCasesCount } = data.metrics;
  const percent = (value: number | null, digits: number) => (value === null ? "—" : `${value.toFixed(digits)}%`);

  return (
    <StatCardGrid cols={6}>
      <StatCard
        label="Headcount"
        value={headcount.value?.total ?? "—"}
        icon={Users}
        tone="default"
      />
      <StatCard
        label="Active"
        value={headcount.value?.active ?? "—"}
        icon={UserCheck}
        tone="emerald"
        hint={headcount.value ? `${headcount.value.probation} on probation` : undefined}
      />
      <StatCard
        label="Attrition this month"
        value={percent(attritionRate.value, 1)}
        icon={TrendingDown}
        tone={(attritionRate.value ?? 0) > 15 ? "amber" : "default"}
      />
      <StatCard
        label="Attendance this month"
        value={percent(attendanceRatePct.value, 0)}
        icon={ClipboardList}
        tone={attendanceRatePct.value !== null && attendanceRatePct.value < 80 ? "amber" : "emerald"}
      />
      <StatCard
        label="Leave utilization this month"
        value={percent(leaveUtilizationPct.value, 0)}
        icon={BarChart2}
        tone="default"
      />
      <StatCard
        label="Open cases"
        value={openCasesCount.value ?? "—"}
        icon={Inbox}
        tone={(openCasesCount.value ?? 0) > 0 ? "amber" : "default"}
      />
    </StatCardGrid>
  );
}
