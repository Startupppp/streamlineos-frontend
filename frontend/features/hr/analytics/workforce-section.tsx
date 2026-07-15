"use client";

import { useMemo } from "react";
import { useHrAnalytics } from "@/hooks/api/hr/analytics";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Users, TrendingUp, UserMinus, UserPlus } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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

interface WorkforceSectionProps {
  data: ReturnType<typeof useHrAnalytics>["data"];
  isLoading: boolean;
}

export function WorkforceSection({ data, isLoading }: WorkforceSectionProps) {
  const activeRate = useMemo(() => {
    if (!data) return 0;
    return data.headcount.total > 0
      ? Math.round((data.headcount.active / data.headcount.total) * 100)
      : 0;
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        <SectionSkeleton rows={8} />
        <SectionSkeleton rows={8} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <section className="space-y-4">
      <AnalyticsSectionHeader
        title="Workforce Overview"
        description="Headcount composition, diversity, and joining vs exit movement."
      />
      <StatCardGrid cols={4}>
        <StatCard
          label="Total Headcount"
          value={data.headcount.total}
          icon={Users}
          color="blue"
          index={0}
        />
        <StatCard
          label="Active"
          value={data.headcount.active}
          icon={TrendingUp}
          hint={`${activeRate}% active rate`}
          color="green"
          index={1}
        />
        <StatCard
          label="Inactive"
          value={data.headcount.total - data.headcount.active}
          icon={UserMinus}
          color="red"
          index={2}
        />
        <StatCard
          label="New Joins (Month)"
          value={data.headcount.newThisMonth}
          icon={UserPlus}
          color="blue"
          index={3}
        />
      </StatCardGrid>

      <div className="grid gap-3 md:grid-cols-2">
        <AnalyticsChartCard title="Headcount by Department">
          {data.departments.length > 0 ? (
            <SimpleBar
              data={data.departments.map((d) => ({
                label: d.name,
                value: d.count,
              }))}
            />
          ) : (
            <EmptyChart label="No department data" />
          )}
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Gender Diversity">
          {data.gender.length > 0 ? (
            <div className="space-y-4">
              {data.gender.map((g) => {
                const total = data.headcount.active || 1;
                const pct = Math.round((g.count / total) * 100);
                return (
                  <div key={g.gender} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{g.gender}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {g.count} ({pct}%)
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyChart label="No gender data" />
          )}
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Role Distribution" className="md:col-span-2">
          {data.roles.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.roles.map((r) => (
                <Badge key={r.role} variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs">
                  {r.role}
                  <span className="font-bold tabular-nums">{r.count}</span>
                </Badge>
              ))}
            </div>
          ) : (
            <EmptyChart label="No role data" />
          )}
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Joining vs Exits Trend (YTD)" className="md:col-span-2">
          {data.joiningExitsTrend.some((m) => m.joins > 0 || m.exits > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={data.joiningExitsTrend}
                margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
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
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Line
                  type="monotone"
                  dataKey="joins"
                  name="New Joins"
                  stroke={CHART_SEMANTIC.success}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: CHART_SEMANTIC.success }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="exits"
                  name="Exits"
                  stroke={CHART_SEMANTIC.danger}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: CHART_SEMANTIC.danger }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart label="No joining or exit data for this year" />
          )}
        </AnalyticsChartCard>
      </div>
    </section>
  );
}
