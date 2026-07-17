"use client";

import { useHrAttritionAnalytics } from "@/hooks/api/hr/analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Users, UserMinus, TrendingDown } from "lucide-react";
import dynamic from "next/dynamic";
import {
  AnalyticsChartCard,
  AnalyticsSectionHeader,
  EmptyChart,
} from "./shared";

const AttritionTrendChart = dynamic(
  () => import("./attrition-trend-chart").then((m) => ({ default: m.AttritionTrendChart })),
  { ssr: false, loading: () => <Skeleton className="h-[220px] w-full" /> },
);

interface AttritionSectionProps {
  isLoading: boolean;
}

export function AttritionSection({ isLoading }: AttritionSectionProps) {
  const { data } = useHrAttritionAnalytics();

  if (isLoading || !data) {
    return (
      <section className="space-y-4">
        <Skeleton className="h-5 w-44" />
        <StatCardGridSkeleton cols={3} />
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

      <StatCardGrid cols={3}>
        <StatCard
          label="Total Employees"
          value={data.totalEmployees}
          icon={Users}
          tone="blue"
        />
        <StatCard
          label="Resignations (YTD)"
          value={data.resignedThisYear}
          icon={UserMinus}
          tone="red"
        />
        <StatCard
          label="Attrition Rate"
          value={`${data.attritionRatePercent}%`}
          icon={TrendingDown}
          tone="amber"
        />
      </StatCardGrid>

      <AnalyticsChartCard title="Resignation Trend by Month (YTD)">
        {monthlyData.length > 0 ? (
          <AttritionTrendChart data={monthlyData} />
        ) : (
          <EmptyChart label="No resignation data for this year" />
        )}
      </AnalyticsChartCard>
    </section>
  );
}
