"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared/error-state";
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
import { useCrmOptions } from "@/hooks/api/crm/metadata";

export default function CrmAnalyticsPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [selectedSource, setSelectedSource] = useState<string>("all");

  const dateRange = useMemo(() => periodToDateRange(period), [period]);

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p);
  }, []);

  const handleSourceChange = useCallback((src: string) => {
    setSelectedSource(src);
  }, []);

  const { data: sourceOptions = [] } = useCrmOptions("source");

  const {
    isLoading,
    isError,
    refetch,
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

  const filteredSourceBreakdown = useMemo(() => {
    if (selectedSource === "all") return sourceBreakdown;
    return sourceBreakdown.filter(
      (s) => s.name.toLowerCase().replace(/\s+/g, "_") === selectedSource
    );
  }, [sourceBreakdown, selectedSource]);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  if (isLoading) {
    return <AnalyticsLoadingSkeleton />;
  }

  if (isError) {
    return (
      <PageWrapper
        title="CRM Analytics"
        subtitle="Pipeline insights and performance metrics"
      >
        <ErrorState
          title="Failed to load analytics"
          description="Check your connection and try again."
          onRetry={handleRetry}
          className="flex-1 min-h-[50vh]"
        />
      </PageWrapper>
    );
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

        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
          <PipelineFunnelChart data={funnelData} />
          <LeadVolumeChart data={leadVolumeTrend} />
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex flex-wrap gap-1 px-1 overflow-x-auto">
              <button
                onClick={() => handleSourceChange("all")}
                className={`h-8 rounded-md px-3 text-xs font-medium transition-colors ${
                  selectedSource === "all"
                    ? "bg-blue-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                All sources
              </button>
              {sourceOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => handleSourceChange(opt.key)}
                  className={`h-8 rounded-md px-3 text-xs font-medium transition-colors ${
                    selectedSource === opt.key
                      ? "bg-blue-500 text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <SourceBreakdownChart data={filteredSourceBreakdown} />
          </div>
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
