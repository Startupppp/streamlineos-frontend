"use client";

import { useHrAttendanceAnalytics } from "@/hooks/api/hr/analytics";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Clock, Building2, CalendarCheck } from "lucide-react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  AnalyticsChartCard,
  AnalyticsSectionHeader,
  EmptyChart,
  SectionSkeleton,
  SimpleBar,
} from "./shared";

const AttendanceTrendChart = dynamic(
  () => import("./attendance-trend-chart").then((m) => ({ default: m.AttendanceTrendChart })),
  { ssr: false, loading: () => <Skeleton className="h-[200px] w-full" /> },
);

interface AttendanceSectionProps {
  year: number;
  month: number;
}

export function AttendanceSection({ year, month }: AttendanceSectionProps) {
  const { data, isLoading, isError, error, refetch } = useHrAttendanceAnalytics(year, month);

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="h-5 w-44 animate-pulse rounded bg-muted" />
        <div className="grid gap-3 md:grid-cols-2">
          <SectionSkeleton rows={8} />
          <SectionSkeleton rows={8} />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load attendance analytics"
        description={getErrorMessage(error)}
        onRetry={() => void refetch()}
      />
    );
  }

  if (!data) return null;

  const dailyChartData = data.daily.map((d) => ({
    date: d.date.slice(8),
    count: d.count,
  }));

  return (
    <section className="space-y-4">
      <AnalyticsSectionHeader
        title="Attendance Analytics"
        description="Check-in volume by department and day for the selected period."
      />
      <StatCardGrid cols={3}>
        <StatCard
          label="Total Logs (Month)"
          value={data.totalAttendanceLogs}
          icon={Clock}
          color="blue"
          index={0}
        />
        <StatCard
          label="Departments Tracked"
          value={data.byDepartment.length}
          icon={Building2}
          color="green"
          index={1}
        />
        <StatCard
          label="Active Days"
          value={data.daily.length}
          icon={CalendarCheck}
          color="blue"
          index={2}
        />
      </StatCardGrid>

      <div className="grid gap-3 md:grid-cols-2">
        <AnalyticsChartCard title="Department-wise Attendance">
          {data.byDepartment.length > 0 ? (
            <SimpleBar
              data={data.byDepartment.map((d) => ({
                label: d.department,
                value: d.count,
              }))}
            />
          ) : (
            <EmptyChart label="No department attendance data" />
          )}
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Daily Attendance Trend">
          {dailyChartData.length > 0 ? (
            <AttendanceTrendChart data={dailyChartData} />
          ) : (
            <EmptyChart label="No daily attendance data" />
          )}
        </AnalyticsChartCard>
      </div>
    </section>
  );
}
