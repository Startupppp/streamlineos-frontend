"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FileDown, History, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/api/access";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useLeadStats,
  useLeadSlaAlerts,
  useSalesLeaderboard,
} from "@/hooks/api/leads";
import { useDealStats } from "@/hooks/api/crm/deals";
import { useLeadSourceReport } from "@/hooks/api/crm/leads";
import { useCrmOptions } from "@/hooks/api/crm/metadata";
import {
  PERIOD_OPTIONS,
  periodToDateRange,
  type Period,
} from "@/features/crm/reports/lib/types";
import { useCrmReportsExport } from "@/features/crm/reports/hooks/use-crm-reports-export";
import { PeriodFilter } from "@/features/crm/reports/components/period-filter";
import { SlaAlertCard } from "@/features/crm/reports/components/sla-alert-card";
import { PipelineOverview } from "@/features/crm/reports/components/pipeline-overview";
import { ConversionFunnelCard } from "@/features/crm/reports/components/conversion-funnel-card";
import { SourceAttributionCard } from "@/features/crm/reports/components/source-attribution-card";
import { TeamLeaderboardCard } from "@/features/crm/reports/components/team-leaderboard-card";
import { ActivitySummary } from "@/features/crm/reports/components/activity-summary";
import { PipelineBreakdownCard } from "@/features/crm/reports/components/pipeline-breakdown-card";
import { ReportsSkeleton } from "@/features/crm/reports/components/reports-skeleton";
import { ReportsError } from "@/features/crm/reports/components/reports-error";

export default function CrmReportsPage() {
  const [period, setPeriod] = useState<Period>("month");
  const canBuildReports = useCan("crm:reporting:run");
  /*
    The audit read is its own key. An auditor holds `view` and not `run`, so the
    way into the run log must not be gated on the ability to run reports — that
    is the whole reason the controller separates the two.
  */
  const canReviewRuns = useCan("crm:reporting:view");

  const dateRange = useMemo(() => periodToDateRange(period), [period]);

  const {
    data: stats,
    isLoading: statsLoading,
    isError,
    refetch,
  } = useLeadStats({ dateFrom: dateRange.dateFrom, dateTo: dateRange.dateTo });
  const { data: slaData } = useLeadSlaAlerts();
  const { data: dealStats, isLoading: dealStatsLoading } = useDealStats();
  const { data: sourceReport, isLoading: sourceLoading } = useLeadSourceReport();
  const { data: leaderboard, isLoading: leaderboardLoading } =
    useSalesLeaderboard();
  const { data: statusOptions } = useCrmOptions("lead_status");

  const isLoading = statsLoading || dealStatsLoading;

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const { handleExport } = useCrmReportsExport({
    stats,
    dealStats,
    sourceReport,
    leaderboard,
    period,
  });

  const maxPipelineCount = useMemo(() => {
    if (!stats) return 1;
    return Math.max(1, ...Object.values(stats.byStatus));
  }, [stats]);

  const periodLabel =
    PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? "This Month";

  if (isLoading) {
    return <ReportsSkeleton />;
  }

  if (isError) {
    return <ReportsError onRetry={handleRetry} />;
  }

  return (
    <PageWrapper
      title="Reports"
      subtitle="Sales performance and pipeline analytics"
      filters={
        <PeriodFilter period={period} onPeriodChange={handlePeriodChange} />
      }
      actions={
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 sm:flex-none">
            <FileDown className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
          {canReviewRuns ? (
            <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-none">
              <Link href="/crm/reports/activity">
                <History className="h-3.5 w-3.5 mr-1.5" />
                Activity
              </Link>
            </Button>
          ) : null}
          {canBuildReports ? (
            <Button size="sm" asChild className="flex-1 sm:flex-none">
              <Link href="/crm/reports/builder">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Report builder
              </Link>
            </Button>
          ) : null}
        </div>
      }
    >
      <motion.div
        className="space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {slaData && slaData.total > 0 && (
          <motion.div variants={fadeUp}>
            <SlaAlertCard slaData={slaData} />
          </motion.div>
        )}

        <motion.div variants={fadeUp}>
          <PipelineOverview
            stats={stats}
            dealStats={dealStats}
            periodLabel={periodLabel}
          />
        </motion.div>

        {stats && (
          <motion.div variants={fadeUp}>
            <ConversionFunnelCard stats={stats} statusOptions={statusOptions} />
          </motion.div>
        )}

        <motion.div variants={fadeUp}>
          <SourceAttributionCard
            sourceReport={sourceReport}
            isLoading={sourceLoading}
          />
        </motion.div>

        <motion.div variants={fadeUp}>
          <TeamLeaderboardCard
            leaderboard={leaderboard}
            isLoading={leaderboardLoading}
          />
        </motion.div>

        <motion.div variants={fadeUp}>
          <ActivitySummary leaderboard={leaderboard} periodLabel={periodLabel} />
        </motion.div>

        {stats && (
          <motion.div variants={fadeUp}>
            <PipelineBreakdownCard
              stats={stats}
              maxPipelineCount={maxPipelineCount}
            />
          </motion.div>
        )}
      </motion.div>
    </PageWrapper>
  );
}
