"use client";

import { useHrLeaveAnalytics } from "@/lib/api/hooks/hr/leaves-expenses";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  AnalyticsChartCard,
  AnalyticsSectionHeader,
  CHART_SEMANTIC,
  EmptyChart,
  PIE_COLORS,
  SectionSkeleton,
  SimpleBar,
  chartAxisTick,
  chartGridProps,
  chartTooltipStyle,
} from "./shared";

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
          <SectionSkeleton rows={5} />
          <SectionSkeleton rows={4} />
          <SectionSkeleton rows={4} />
          <SectionSkeleton rows={4} />
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
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={deptData}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                barCategoryGap="24%"
                barGap={4}
              >
                <CartesianGrid {...chartGridProps} />
                <XAxis
                  dataKey="dept"
                  tick={chartAxisTick}
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
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar
                  dataKey="approved"
                  fill={CHART_SEMANTIC.success}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                />
                <Bar
                  dataKey="pending"
                  fill={CHART_SEMANTIC.warning}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                />
                <Bar
                  dataKey="rejected"
                  fill={CHART_SEMANTIC.danger}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="No department leave data" />
          )}
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Monthly Leave Trend (Approved)">
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={monthlyData}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                barCategoryGap="32%"
              >
                <CartesianGrid {...chartGridProps} />
                <XAxis
                  dataKey="month"
                  tick={chartAxisTick}
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
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="No monthly leave data" />
          )}
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Leave Type Breakdown">
          {leaveTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={leaveTypeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={72}
                  innerRadius={44}
                  paddingAngle={3}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {leaveTypeData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              </PieChart>
            </ResponsiveContainer>
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
