"use client";

import { useHrAttendanceAnalytics } from "@/hooks/api/hr/analytics";
import { StatCard } from "@/components/ui/stat-card";
import { Clock, Building2, CalendarCheck } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  AnalyticsChartCard,
  AnalyticsSectionHeader,
  CHART_SEMANTIC,
  EmptyChart,
  SectionSkeleton,
  SimpleBar,
  chartAxisTick,
  chartGridProps,
  chartTooltipStyle,
} from "./shared";

interface AttendanceSectionProps {
  year: number;
  month: number;
}

export function AttendanceSection({ year, month }: AttendanceSectionProps) {
  const { data, isLoading } = useHrAttendanceAnalytics(year, month);

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="h-5 w-44 animate-pulse rounded bg-muted" />
        <div className="grid gap-3 md:grid-cols-2">
          <SectionSkeleton rows={5} />
          <SectionSkeleton rows={6} />
        </div>
      </section>
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
          color="violet"
          index={2}
        />
      </div>

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
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={dailyChartData}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                barCategoryGap="28%"
              >
                <CartesianGrid {...chartGridProps} />
                <XAxis
                  dataKey="date"
                  tick={chartAxisTick}
                  interval={Math.max(0, Math.floor(dailyChartData.length / 8) - 1)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={chartAxisTick}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar
                  dataKey="count"
                  fill={CHART_SEMANTIC.primary}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="No daily attendance data" />
          )}
        </AnalyticsChartCard>
      </div>
    </section>
  );
}
