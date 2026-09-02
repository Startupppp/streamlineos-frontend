"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  GitBranch,
  CheckCircle2,
  Activity,
  Clock,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { useWorkflowAnalytics } from "@/hooks/api/workflows";

function TrendBar({ count, max, successCount }: { count: number; max: number; successCount: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  const successPct = count > 0 ? (successCount / count) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ "--bar-pct": `${pct}%`, width: "var(--bar-pct)" } as React.CSSProperties}
        />
      </div>
      <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-status-success-fill rounded-full transition-all duration-500"
          style={{ "--success-pct": `${successPct}%`, width: "var(--success-pct)" } as React.CSSProperties}
        />
      </div>
    </div>
  );
}

export default function WorkflowAnalyticsPage() {
  const { data, isLoading, isError, refetch } = useWorkflowAnalytics();

  function handleRetry() {
    void refetch();
  }

  const avgDurationLabel =
    !data || data.avgDuration === 0
      ? "—"
      : data.avgDuration < 60_000
      ? `${Math.round(data.avgDuration / 1000)}s`
      : `${Math.floor(data.avgDuration / 60_000)}m ${Math.round((data.avgDuration % 60_000) / 1000)}s`;

  const activeShare =
    data && data.totalWorkflows > 0
      ? Math.round((data.activeWorkflows / data.totalWorkflows) * 100)
      : 0;

  const maxCount = data ? Math.max(...(data.executionTrend?.map((t) => t.count) ?? [0]), 1) : 1;
  const hasTrend = Boolean(data?.executionTrend && data.executionTrend.length > 0);
  const hasNoWorkflows = Boolean(data && data.totalWorkflows === 0);

  return (
    <PageWrapper
      title="Workflow Analytics"
      subtitle="Execution trends and workflow performance metrics"
    >
      {isLoading ? (
        <LoadingState variant="page" />
      ) : isError || !data ? (
        <ErrorState
          title="Failed to load analytics"
          description="Something went wrong while fetching workflow analytics."
          onRetry={handleRetry}
          className={CONTENT_FILL_PANEL}
        />
      ) : hasNoWorkflows ? (
        <EmptyState
          className="flex-1"
          illustrationPreset="automations"
          title="No workflows to measure"
          description="Build your first workflow and its runs, success rate and durations will be charted here."
          action={{ label: "Go to workflows", href: "/workflows" }}
        />
      ) : (
        <div className="flex flex-1 min-h-0 flex-col gap-6">
          <StatCardGrid cols={3}>
            <StatCard label="Total Workflows" value={data.totalWorkflows} icon={GitBranch} tone="violet" />
            <StatCard
              label="Active Workflows"
              value={data.activeWorkflows}
              icon={CheckCircle2}
              tone="emerald"
              hint={`${activeShare}% of total`}
            />
            <StatCard label="Total Executions" value={data.totalExecutions.toLocaleString()} icon={Activity} tone="blue" />
            <StatCard label="Success Rate" value={`${data.successRate.toFixed(1)}%`} icon={TrendingUp} tone="emerald" />
            <StatCard label="Avg Duration" value={avgDurationLabel} icon={Clock} tone="amber" />
            <StatCard label="Pending Approvals" value={data.pendingApprovals} icon={AlertCircle} tone="amber" />
          </StatCardGrid>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut", delay: 0.36 }}
          >
            <Card className="bg-card rounded-xl border border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Execution Trend</CardTitle>
                <div className="flex items-center gap-4 text-dense text-muted-foreground mt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-1.5 rounded-full bg-primary inline-block" />
                    Total
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-1.5 rounded-full bg-status-success-fill inline-block" />
                    Successful
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {hasTrend ? (
                  data.executionTrend.map((item) => (
                    <div key={item.date} className="flex items-center gap-3">
                      <span className="text-dense text-muted-foreground tabular-nums w-20 shrink-0">
                        {format(new Date(item.date), "MMM d")}
                      </span>
                      <TrendBar count={item.count} max={maxCount} successCount={item.successCount} />
                      <span className="text-dense tabular-nums text-foreground w-8 text-right shrink-0">
                        {item.count}
                      </span>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    compact
                    illustrationPreset="chart"
                    title="No runs in this window"
                    description="Nothing has executed recently, so there is no trend to plot yet."
                  />
                )}
              </CardContent>
            </Card>
          </motion.div>

          <p className="text-dense text-muted-foreground text-center">
            Analytics data refreshes every hour
          </p>
        </div>
      )}
    </PageWrapper>
  );
}
