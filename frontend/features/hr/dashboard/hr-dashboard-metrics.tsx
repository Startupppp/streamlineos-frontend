"use client";

import { Users, UserCheck, CalendarOff, Clock, Briefcase, TrendingUp } from "lucide-react";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useHrDashboardMetrics } from "@/hooks/api/hr/dashboard";

export function HrDashboardMetrics() {
  const { data, isLoading, isError, error, refetch } = useHrDashboardMetrics();

  if (isLoading) return <StatCardGridSkeleton cols={4} />;
  if (isError)
    return (
      <ErrorState
        title="Couldn't load metrics"
        description={getErrorMessage(error)}
        onRetry={() => void refetch()}
        className="min-h-[80px]"
      />
    );

  if (!data) return null;

  return (
    <StatCardGrid cols={4}>
      <StatCard
        label="Total employees"
        value={data.totalEmployees}
        icon={Users}
        tone="default"
      />
      <StatCard
        label="Active employees"
        value={data.activeEmployees}
        icon={UserCheck}
        tone="emerald"
      />
      <StatCard
        label="On leave today"
        value={data.onLeaveToday}
        icon={CalendarOff}
        tone="amber"
      />
      <StatCard
        label="Pending leaves"
        value={data.pendingLeaveRequests}
        icon={Clock}
        tone="amber"
      />
      <StatCard
        label="Open positions"
        value={data.openPositions}
        icon={Briefcase}
        tone="blue"
      />
      <StatCard
        label="Hires this month"
        value={data.monthlyHires}
        icon={TrendingUp}
        tone="emerald"
      />
    </StatCardGrid>
  );
}
