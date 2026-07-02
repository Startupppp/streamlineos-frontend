"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { staggerContainer } from "@/lib/motion-variants";
import { PipelineFunnelChart } from "@/features/crm/analytics/pipeline-funnel-chart";
import { SourceBreakdownChart } from "@/features/crm/analytics/source-breakdown-chart";
import { RepPerformanceTable } from "@/features/crm/analytics/rep-performance-table";
import { LeadVolumeChart } from "@/features/crm/analytics/lead-volume-chart";
import { ConversionChart } from "@/features/crm/analytics/conversion-chart";
import { DealValueChart } from "@/features/crm/analytics/deal-value-chart";
import { PeriodSelector, periodToDateRange } from "@/features/crm/analytics/period-selector";
import type { Period } from "@/features/crm/analytics/period-selector";
import { useAnalyticsData } from "@/features/crm/analytics/use-analytics-data";
import { AnalyticsLoadingSkeleton } from "@/features/crm/analytics/analytics-loading-skeleton";
import { AnalyticsKpiCards } from "@/features/crm/analytics/analytics-kpi-cards";
import { SlaComplianceChart } from "@/features/crm/analytics/sla-compliance-chart";
import { ScoreDistributionChart } from "@/features/crm/analytics/score-distribution-chart";
import { AssignmentDistributionChart } from "@/features/crm/analytics/assignment-distribution-chart";
import { ConversionBySourceChart } from "@/features/crm/analytics/conversion-by-source-chart";
import { MonthlyRevenueChart } from "@/features/crm/analytics/monthly-revenue-chart";
import { RevenueVsGoalChart } from "@/features/crm/analytics/revenue-vs-goal-chart";
import { WinRateTrendChart } from "@/features/crm/analytics/win-rate-trend-chart";
import { TaskAnalyticsCard } from "@/features/crm/analytics/task-analytics-card";

export default function CrmAnalyticsPage() {
  const [period, setPeriod] = useState<Period>("month");

  const dateRange = useMemo(() => periodToDateRange(period), [period]);

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p);
  }, []);

  const {
    isLoading,
    revenueGoalLoading,
    leaderboard,
    slaReport,
    analyticsSummary,
    kpis,
    taskAnalytics,
    funnelData,
    leadVolumeTrend,
    sourceBreakdown,
    dealsByStageValue,
    wonLostReasons,
    scoreDistribution,
    revenueGoalData,
  } = useAnalyticsData(dateRange);

  if (isLoading) {
    return <AnalyticsLoadingSkeleton />;
  }

  return (
    <PageWrapper
      title="CRM Analytics"
      subtitle="Pipeline insights and performance metrics"
      filters={<PeriodSelector period={period} onPeriodChange={handlePeriodChange} />}
    >
      <motion.div
        className="space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {analyticsSummary && (
          <AnalyticsKpiCards analyticsSummary={analyticsSummary} kpis={kpis} />
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <PipelineFunnelChart data={funnelData} />
          <LeadVolumeChart data={leadVolumeTrend} />
          <SourceBreakdownChart data={sourceBreakdown} />
          <RepPerformanceTable leaderboard={leaderboard} />
          <ConversionChart data={wonLostReasons} />
          <DealValueChart data={dealsByStageValue} />
          <SlaComplianceChart slaReport={slaReport} />
          <ScoreDistributionChart data={scoreDistribution} />

          {analyticsSummary &&
            analyticsSummary.assignmentDistribution.length > 0 && (
              <AssignmentDistributionChart
                data={analyticsSummary.assignmentDistribution}
              />
            )}

          {analyticsSummary &&
            analyticsSummary.conversionBySource.length > 0 && (
              <ConversionBySourceChart
                data={analyticsSummary.conversionBySource}
              />
            )}

          {analyticsSummary && analyticsSummary.monthlyRevenue.length > 0 && (
            <MonthlyRevenueChart data={analyticsSummary.monthlyRevenue} />
          )}

          {!revenueGoalLoading && revenueGoalData.length > 0 && (
            <RevenueVsGoalChart data={revenueGoalData} />
          )}

          {kpis && <WinRateTrendChart kpis={kpis} />}
        </div>

        {taskAnalytics && <TaskAnalyticsCard taskAnalytics={taskAnalytics} />}
      </motion.div>
    </PageWrapper>
  );
}
