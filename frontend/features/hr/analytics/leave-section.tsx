"use client";

import { useHrLeaveAnalytics } from "@/hooks/api/hr/leaves-expenses";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AnalyticsChartCard,
  AnalyticsSectionHeader,
  EmptyChart,
  SectionSkeleton,
  SimpleBar,
} from "./shared";

const LeaveDeptChart = dynamic(
  () => import("./leave-charts").then((m) => ({ default: m.LeaveDeptChart })),
  { ssr: false, loading: () => <Skeleton className="h-[220px] w-full" /> },
);
const LeaveMonthlyChart = dynamic(
  () => import("./leave-charts").then((m) => ({ default: m.LeaveMonthlyChart })),
  { ssr: false, loading: () => <Skeleton className="h-[220px] w-full" /> },
);
const LeaveTypePieChart = dynamic(
  () => import("./leave-charts").then((m) => ({ default: m.LeaveTypePieChart })),
  { ssr: false, loading: () => <Skeleton className="h-[200px] w-full" /> },
);

interface LeaveSectionProps {
  year: number;
}

export function LeaveSection({ year }: LeaveSectionProps) {
  const { data, isLoading } = useHrLeaveAnalytics(year);

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="h-5 w-36 animate-pulse rounded bg-muted" />
        <div className="grid gap-3 md:grid-cols-2">
          <SectionSkeleton rows={8} />
          <SectionSkeleton rows={8} />
          <SectionSkeleton rows={8} />
          <SectionSkeleton rows={8} />
        </div>
      </section>
    );
  }

  if (!data) return null;

  const monthlyData = data.monthlyTrend.map((m) => ({
    month: m.month,
    count: m.count,
  }));

  const deptData = data.byDepartment.map((d) => ({
    dept: d.department.length > 10 ? `${d.department.slice(0, 10)}…` : d.department,
    approved: d.approved,
    pending: d.pending,
    rejected: d.rejected,
  }));

  const leaveTypeData = data.byLeaveType.map((t) => ({
    name: t.typeName,
    value: t.count,
  }));

  const avgDaysData = data.avgDaysByDepartment
    .sort((a, b) => b.avgDays - a.avgDays)
    .map((d) => ({
      label: d.department,
      value: d.avgDays,
    }));

  return (
    <section className="space-y-4">
      <AnalyticsSectionHeader
        title="Leave Analytics"
        description="Approved leave trends, types, and department utilization."
      />

      <div className="grid gap-3 md:grid-cols-2">
        <AnalyticsChartCard title="Department-wise Leave Trends">
          {deptData.length > 0 ? (
            <LeaveDeptChart data={deptData} />
          ) : (
            <EmptyChart label="No department leave data" />
          )}
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Monthly Leave Trend (Approved)">
          {monthlyData.length > 0 ? (
            <LeaveMonthlyChart data={monthlyData} />
          ) : (
            <EmptyChart label="No monthly leave data" />
          )}
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Leave Type Breakdown">
          {leaveTypeData.length > 0 ? (
            <LeaveTypePieChart data={leaveTypeData} />
          ) : (
            <EmptyChart label="No leave type data" />
          )}
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Avg Leave Days by Department">
          {avgDaysData.length > 0 ? (
            <SimpleBar data={avgDaysData} />
          ) : (
            <EmptyChart label="No utilization data" />
          )}
        </AnalyticsChartCard>
      </div>
    </section>
  );
}
