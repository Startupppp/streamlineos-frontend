"use client";

import { useHrAttritionAnalytics } from "@/hooks/api/hr/analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { Users, UserMinus, TrendingDown } from "lucide-react";
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
  chartAxisTick,
  chartGridProps,
  chartTooltipStyle,
} from "./shared";

interface AttritionSectionProps {
  isLoading: boolean;
}

export function AttritionSection({ isLoading }: AttritionSectionProps) {
  const { data } = useHrAttritionAnalytics();

  if (isLoading || !data) {
    return (
      <section className="space-y-4">
        <Skeleton className="h-5 w-44" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <SectionSkeleton rows={2} />
          <SectionSkeleton rows={2} />
          <SectionSkeleton rows={2} />
        </div>
      </section>
    );
  }

  const monthlyData = data.byMonth.map((m) => ({
    month: m.month.slice(5),
    resignations: m.count,
  }));

  return (
    <section className="space-y-4">
      <AnalyticsSectionHeader
        title="Attrition & Retention"
        description="Year-to-date exits and monthly resignation trend."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard
          label="Total Employees"
          value={data.totalEmployees}
          icon={Users}
          color="blue"
          index={0}
        />
        <StatCard
          label="Resignations (YTD)"
          value={data.resignedThisYear}
          icon={UserMinus}
          color="red"
          index={1}
        />
        <StatCard
          label="Attrition Rate"
          value={`${data.attritionRatePercent}%`}
          icon={TrendingDown}
          color="amber"
          index={2}
        />
      </div>

      <AnalyticsChartCard title="Resignation Trend by Month (YTD)">
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
                dataKey="resignations"
                fill={CHART_SEMANTIC.danger}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart label="No resignation data for this year" />
        )}
      </AnalyticsChartCard>
    </section>
  );
}
