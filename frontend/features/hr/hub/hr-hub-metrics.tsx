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
import {
  hubSectionData,
  hubSectionError,
  type HrHubViewProps,
} from "@/hooks/api/hr/hub";
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

  if (!access.canAnalytics) return null;

  if (isLoading) return <StatCardGridSkeleton cols={6} count={6} />;
  if (error) return <ErrorRetry error={error} onRetry={onRetry} />;
  if (!data) return null;

  const attritionPct = `${data.attritionRate12mo.toFixed(1)}%`;
  const attendancePct = `${data.attendanceRatePct.toFixed(0)}%`;
  const leavePct = `${data.leaveUtilizationPct.toFixed(0)}%`;

  return (
    <StatCardGrid cols={6}>
      <StatCard
        label="Headcount"
        value={data.headcount.total}
        icon={Users}
        tone="default"
        href={access.canEmployees ? "/hr/employees" : undefined}
      />
      <StatCard
        label="Active"
        value={data.headcount.active}
        icon={UserCheck}
        tone="emerald"
        hint={`${data.headcount.probation} on probation`}
        href={access.canEmployees ? "/hr/employees" : undefined}
      />
      <StatCard
        label="Attrition 12mo"
        value={attritionPct}
        icon={TrendingDown}
        tone={data.attritionRate12mo > 15 ? "amber" : "default"}
        href="/hr/analytics"
      />
      <StatCard
        label="Attendance rate"
        value={attendancePct}
        icon={ClipboardList}
        tone={data.attendanceRatePct < 80 ? "amber" : "emerald"}
        href={access.canAttendanceView ? "/hr/attendance" : undefined}
      />
      <StatCard
        label="Leave utilization"
        value={leavePct}
        icon={BarChart2}
        tone="default"
        href={access.canLeaves ? "/hr/leaves" : undefined}
      />
      <StatCard
        label="Open cases"
        value={data.openCasesCount}
        icon={Inbox}
        tone={data.openCasesCount > 0 ? "amber" : "default"}
        href={access.canCases ? "/hr/cases" : undefined}
      />
    </StatCardGrid>
  );
}
