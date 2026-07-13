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
import { cn } from "@/lib/utils";
import { useWorkflowAnalytics } from "@/hooks/api/workflows";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  index: number;
  sub?: string;
}

function StatCard({ label, value, icon, iconBg, index, sub }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay: index * 0.06 }}
    >
      <Card className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
              {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            </div>
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TrendBar({ count, max, successCount }: { count: number; max: number; successCount: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  const successPct = count > 0 ? (successCount / count) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
          style={{ "--bar-pct": `${pct}%`, width: "var(--bar-pct)" } as React.CSSProperties}
        />
      </div>
      <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-green-400 rounded-full transition-all duration-500"
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

  if (isLoading) return <LoadingState variant="page" />;
  if (isError || !data) {
    return (
      <ErrorState
        title="Failed to load analytics"
        description="Something went wrong while fetching workflow analytics."
        onRetry={handleRetry}
        className="flex-1"
      />
    );
  }

  const avgDurationLabel =
    data.avgDuration === 0
      ? "—"
      : data.avgDuration < 60_000
      ? `${Math.round(data.avgDuration / 1000)}s`
      : `${Math.floor(data.avgDuration / 60_000)}m ${Math.round((data.avgDuration % 60_000) / 1000)}s`;

  const stats: StatCardProps[] = [
    {
      label: "Total Workflows",
      value: data.totalWorkflows,
      icon: <GitBranch className="h-5 w-5 text-violet-600" />,
      iconBg: "bg-violet-50",
      index: 0,
    },
    {
      label: "Active Workflows",
      value: data.activeWorkflows,
      icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
      iconBg: "bg-green-50",
      index: 1,
      sub: `${data.totalWorkflows > 0 ? Math.round((data.activeWorkflows / data.totalWorkflows) * 100) : 0}% of total`,
    },
    {
      label: "Total Executions",
      value: data.totalExecutions.toLocaleString(),
      icon: <Activity className="h-5 w-5 text-blue-600" />,
      iconBg: "bg-blue-50",
      index: 2,
    },
    {
      label: "Success Rate",
      value: `${data.successRate.toFixed(1)}%`,
      icon: <TrendingUp className="h-5 w-5 text-emerald-600" />,
      iconBg: "bg-emerald-50",
      index: 3,
    },
    {
      label: "Avg Duration",
      value: avgDurationLabel,
      icon: <Clock className="h-5 w-5 text-amber-600" />,
      iconBg: "bg-amber-50",
      index: 4,
    },
    {
      label: "Pending Approvals",
      value: data.pendingApprovals,
      icon: <AlertCircle className="h-5 w-5 text-orange-600" />,
      iconBg: "bg-orange-50",
      index: 5,
    },
  ];

  const maxCount = Math.max(...(data.executionTrend?.map((t) => t.count) ?? [0]), 1);

  return (
    <PageWrapper
      title="Workflow Analytics"
      subtitle="Execution trends and workflow performance metrics"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        {data.executionTrend && data.executionTrend.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut", delay: 0.36 }}
          >
            <Card className="bg-card rounded-xl border border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Execution Trend</CardTitle>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 inline-block" />
                    Total
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-1.5 rounded-full bg-green-400 inline-block" />
                    Successful
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {data.executionTrend.map((item) => (
                  <div key={item.date} className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground tabular-nums w-20 shrink-0">
                      {format(new Date(item.date), "MMM d")}
                    </span>
                    <TrendBar count={item.count} max={maxCount} successCount={item.successCount} />
                    <span className="text-[11px] tabular-nums text-foreground w-8 text-right shrink-0">
                      {item.count}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        <p className="text-[11px] text-muted-foreground text-center">
          Analytics data refreshes every hour
        </p>
      </div>
    </PageWrapper>
  );
}
