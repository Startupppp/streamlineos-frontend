"use client";

import { useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSalesDashboard,
  useCrmPeopleSlugs,
  useSalesDashboardKPIs,
  useSalesDashboardFunnel,
  useSalesDashboardLeaderboard,
  useRevenueVsGoal,
  useDealVelocity,
  useAgingDeals,
  useSalesCycleLength,
  useLostDealAnalysis,
} from "@/lib/api/hooks";
import { useSession } from "next-auth/react";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { safeMax } from "@/lib/format-utils";
import { SalesKpiCards } from "@/features/sales/sales-kpi-cards";
import { SalesPipelineCharts } from "@/features/sales/sales-pipeline-charts";
import { SalesLeaderboard } from "@/features/sales/sales-leaderboard";
import { SalesVelocityCards } from "@/features/sales/sales-velocity-cards";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  format,
} from "date-fns";

type DatePreset =
  | "all"
  | "today"
  | "this_week"
  | "this_month"
  | "last_month"
  | "q1"
  | "q2"
  | "q3"
  | "q4"
  | "ytd";

function getPresetRange(preset: DatePreset): { from?: string; to?: string } {
  const now = new Date();
  const year = now.getFullYear();
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");

  switch (preset) {
    case "today":
      return { from: fmt(startOfDay(now)), to: fmt(endOfDay(now)) };
    case "this_week":
      return { from: fmt(startOfWeek(now, { weekStartsOn: 1 })), to: fmt(endOfWeek(now, { weekStartsOn: 1 })) };
    case "this_month":
      return { from: fmt(startOfMonth(now)), to: fmt(endOfMonth(now)) };
    case "last_month": {
      const lm = subMonths(now, 1);
      return { from: fmt(startOfMonth(lm)), to: fmt(endOfMonth(lm)) };
    }
    case "q1":
      return { from: `${year}-01-01`, to: `${year}-03-31` };
    case "q2":
      return { from: `${year}-04-01`, to: `${year}-06-30` };
    case "q3":
      return { from: `${year}-07-01`, to: `${year}-09-30` };
    case "q4":
      return { from: `${year}-10-01`, to: `${year}-12-31` };
    case "ytd":
      return { from: fmt(startOfYear(now)), to: fmt(endOfYear(now)) };
    default:
      return {};
  }
}

export default function SalesDashboardPage() {
  const { data: session } = useSession();
  const isSalesRep = session?.user?.role === "SALES";

  const [datePreset, setDatePreset] = useState<DatePreset>("this_month");
  const [repId, setRepId] = useState<number | undefined>(undefined);

  const dateRange = useMemo(() => getPresetRange(datePreset), [datePreset]);

  const { data, isLoading } = useSalesDashboard();
  const { data: slugMap } = useCrmPeopleSlugs();
  const { data: kpisData } = useSalesDashboardKPIs({ ...dateRange, repId });
  const { data: funnelData } = useSalesDashboardFunnel({ ...dateRange, repId });
  const { data: leaderboardData } = useSalesDashboardLeaderboard(dateRange);
  const { data: revenueVsGoalData } = useRevenueVsGoal();
  const { data: velocityData } = useDealVelocity(dateRange);
  const { data: agingData } = useAgingDeals(14);
  const { data: cycleData } = useSalesCycleLength(repId !== undefined ? String(repId) : undefined);
  const { data: lostData } = useLostDealAnalysis(repId !== undefined ? String(repId) : undefined);

  const salesStats = data?.salesStats;
  const revenueTimeline = data?.revenueTimeline ?? [];
  const salesFunnel = data?.salesFunnel ?? [];
  const topDeals = data?.topDeals ?? [];
  const salesActivity = data?.salesActivity ?? [];
  const dealsByStage = data?.dealsByStage ?? [];
  const enhanced = data?.enhancedMetrics;
  const salesLeaderboard = data?.salesLeaderboard ?? [];

  const maxLeaderboardRevenue = useMemo(
    () => safeMax((leaderboardData ?? salesLeaderboard).map((r) => r.revenue)),
    [leaderboardData, salesLeaderboard],
  );
  const maxDealsByStageCount = useMemo(
    () => safeMax(dealsByStage.map((d) => d.count)),
    [dealsByStage],
  );
  const revenueSparkData = useMemo(
    () => revenueTimeline.map((d) => d.value),
    [revenueTimeline],
  );

  const getPersonSlug = useCallback(
    (name: string) => slugMap?.[name] ?? null,
    [slugMap],
  );

  const handleDatePresetChange = useCallback((value: string) => {
    setDatePreset(value as DatePreset);
  }, []);

  const handleRepChange = useCallback((value: string) => {
    setRepId(value === "all" ? undefined : Number(value));
  }, []);

  const repOptions = useMemo(() => {
    const reps = leaderboardData ?? [];
    return reps.map((r) => ({ id: r.repId, name: r.name }));
  }, [leaderboardData]);

  const kpiPipeline = kpisData?.pipelineValue ?? salesStats?.pipeline.value ?? 0;
  const kpiDealsWon = kpisData?.dealsWon ?? salesStats?.dealsWon.value ?? 0;
  const kpiCloseRate = kpisData?.closeRate ?? salesStats?.conversionRate.value ?? 0;
  const kpiAvgDeal = kpisData?.avgDealSize ?? salesStats?.avgDealSize.value ?? 0;

  const kpiPipelineTrend = kpisData
    ? {
        value: Math.round(Math.abs(((kpisData.totalRevenue - kpisData.prevRevenue) / Math.max(kpisData.prevRevenue, 1)) * 1000) / 10),
        isPositive: kpisData.totalRevenue >= kpisData.prevRevenue,
      }
    : salesStats?.pipeline.trend ?? { value: 0, isPositive: true };

  const kpiCloseRateTrend = kpisData
    ? {
        value: Math.round(Math.abs(kpisData.closeRate - kpisData.prevCloseRate) * 10) / 10,
        isPositive: kpisData.closeRate >= kpisData.prevCloseRate,
      }
    : salesStats?.conversionRate.trend ?? { value: 0, isPositive: true };

  const kpiAvgDealTrend = kpisData
    ? {
        value: Math.round(Math.abs(((kpisData.avgDealSize - kpisData.prevAvgDealSize) / Math.max(kpisData.prevAvgDealSize, 1)) * 1000) / 10),
        isPositive: kpisData.avgDealSize >= kpisData.prevAvgDealSize,
      }
    : salesStats?.avgDealSize.trend ?? { value: 0, isPositive: true };

  const activeLeaderboard = leaderboardData ?? salesLeaderboard;

  if (isLoading || !salesStats) {
    return (
      <PageWrapper title="Sales Dashboard" subtitle="Pipeline overview and sales performance metrics">
        <div className="space-y-4 pb-2">
          <div className="space-y-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-7 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-12 w-12 rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
            <Card className="lg:col-span-7">
              <CardHeader><Skeleton className="h-5 w-36" /></CardHeader>
              <CardContent><Skeleton className="h-[240px] w-full" /></CardContent>
            </Card>
            <Card className="lg:col-span-5">
              <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-[240px] w-full" /></CardContent>
            </Card>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={isSalesRep ? "My Sales Hub" : "Sales Dashboard"}
      subtitle={
        isSalesRep
          ? "Your pipeline, deals, and performance at a glance"
          : "Pipeline overview and sales performance metrics"
      }
    >
      <motion.div
        className="space-y-4 pb-2"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <SalesKpiCards
          datePreset={datePreset}
          dateRange={dateRange}
          repId={repId}
          repOptions={repOptions}
          kpiPipeline={kpiPipeline}
          kpiDealsWon={kpiDealsWon}
          kpiCloseRate={kpiCloseRate}
          kpiAvgDeal={kpiAvgDeal}
          kpiPipelineTrend={kpiPipelineTrend}
          kpiCloseRateTrend={kpiCloseRateTrend}
          kpiAvgDealTrend={kpiAvgDealTrend}
          dealsWonTrend={salesStats.dealsWon.trend}
          revenueSparkData={revenueSparkData}
          enhanced={enhanced}
          onDatePresetChange={handleDatePresetChange}
          onRepChange={handleRepChange}
        />

        <SalesPipelineCharts
          revenueTimeline={revenueTimeline}
          funnelData={funnelData}
          salesFunnel={salesFunnel}
          revenueVsGoalData={revenueVsGoalData ?? []}
          dealsByStage={dealsByStage}
          maxDealsByStageCount={maxDealsByStageCount}
          datePreset={datePreset}
        />

        <SalesLeaderboard
          topDeals={topDeals}
          leaderboard={activeLeaderboard}
          salesActivity={salesActivity}
          maxLeaderboardRevenue={maxLeaderboardRevenue}
          datePreset={datePreset}
          getPersonSlug={getPersonSlug}
        />

        <SalesVelocityCards
          velocityData={velocityData}
          cycleData={cycleData}
          lostData={lostData}
          agingData={agingData}
        />
      </motion.div>
    </PageWrapper>
  );
}
