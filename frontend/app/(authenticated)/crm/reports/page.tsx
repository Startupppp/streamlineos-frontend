"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FileDown,
  TrendingUp,
  Users,
  Target,
  UserCheck,
  BarChart3,
  ArrowDown,
  AlertTriangle,
  Clock,
  Phone,
  Mail,
  Video,
  Trophy,
  DollarSign,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp, scaleIn } from "@/lib/motion-variants";
import {
  useLeadStats,
  useLeadSlaAlerts,
  useSalesLeaderboard,
} from "@/hooks/api/leads";
import { useDealStats } from "@/hooks/api/crm/deals";
import { useLeadSourceReport } from "@/hooks/api/crm/leads";
import { toast } from "sonner";

type Period = "week" | "month" | "quarter" | "year";

interface PeriodOption {
  label: string;
  value: Period;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "Last 3 Months", value: "quarter" },
  { label: "This Year", value: "year" },
];

const PIPELINE_COLORS: Record<string, { color: string }> = {
  NEW: { color: "#3B82F6" },
  CONTACTED: { color: "#0EA5E9" },
  INTERESTED: { color: "#F59E0B" },
  QUALIFIED: { color: "#8B5CF6" },
  CONVERTED: { color: "#10B981" },
  LOST: { color: "#EF4444" },
};

const FUNNEL_STAGES = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED"] as const;

function formatCurrency(value: number): string {
  if (value >= 10_00_000) return `₹${(value / 10_00_000).toFixed(1)}L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(0)}K`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function periodToDateRange(period: Period): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const to = now.toISOString().split("T")[0];

  if (period === "week") {
    const from = new Date(now);
    from.setDate(now.getDate() - 7);
    return { dateFrom: from.toISOString().split("T")[0], dateTo: to };
  }
  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: from.toISOString().split("T")[0], dateTo: to };
  }
  if (period === "quarter") {
    const from = new Date(now);
    from.setMonth(now.getMonth() - 3);
    return { dateFrom: from.toISOString().split("T")[0], dateTo: to };
  }
  const from = new Date(now.getFullYear(), 0, 1);
  return { dateFrom: from.toISOString().split("T")[0], dateTo: to };
}

export default function CrmReportsPage() {
  const [period, setPeriod] = useState<Period>("month");

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
  const { data: leaderboard, isLoading: leaderboardLoading } = useSalesLeaderboard();

  const isLoading = statsLoading || dealStatsLoading;

  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p);
  }, []);

  const handlePeriodButtonClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const p = e.currentTarget.dataset.period as Period | undefined;
      if (p) handlePeriodChange(p);
    },
    [handlePeriodChange],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleExport = useCallback(async () => {
    toast.info("Generating export…");
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const periodLabel =
        PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? period;

      if (stats) {
        const ws = wb.addWorksheet("Summary");
        ws.columns = [
          { header: "Metric", key: "metric", width: 32 },
          { header: "Value", key: "value", width: 28 },
        ];
        ws.getRow(1).font = { bold: true };
        ws.addRows([
          { metric: "Period", value: periodLabel },
          { metric: "Total Leads", value: stats.total },
          { metric: "Conversion Rate", value: `${stats.conversionRate}%` },
          {
            metric: "Total Potential Value",
            value: `₹${stats.totalPotentialValue.toLocaleString("en-IN")}`,
          },
          { metric: "Unassigned Leads", value: stats.unassigned },
          { metric: "New This Month", value: stats.thisMonth },
          ...(dealStats
            ? [
                { metric: "Active Deals", value: dealStats.active },
                {
                  metric: "Pipeline Value",
                  value: `₹${dealStats.pipelineValue.toLocaleString("en-IN")}`,
                },
                {
                  metric: "Won Revenue",
                  value: `₹${dealStats.wonValue.toLocaleString("en-IN")}`,
                },
              ]
            : []),
        ]);
      }

      if (sourceReport?.sources?.length) {
        const ws2 = wb.addWorksheet("Source Attribution");
        ws2.columns = [
          { header: "Source", key: "source", width: 20 },
          { header: "Leads", key: "count", width: 12 },
          { header: "Converted", key: "converted", width: 14 },
          { header: "Win Rate", key: "rate", width: 14 },
          { header: "Total Value", key: "value", width: 20 },
        ];
        ws2.getRow(1).font = { bold: true };
        ws2.addRows(
          sourceReport.sources.map((s) => ({
            source: s.source.replace(/_/g, " "),
            count: s.count,
            converted: s.converted,
            rate: `${s.conversionRate.toFixed(1)}%`,
            value: `₹${s.totalValue.toLocaleString("en-IN")}`,
          })),
        );
      }

      if (leaderboard?.length) {
        const ws3 = wb.addWorksheet("Team Leaderboard");
        ws3.columns = [
          { header: "Rank", key: "rank", width: 8 },
          { header: "Name", key: "name", width: 26 },
          { header: "Leads Assigned", key: "assigned", width: 18 },
          { header: "Leads Converted", key: "converted", width: 18 },
          { header: "Revenue", key: "revenue", width: 20 },
          { header: "Score", key: "score", width: 10 },
        ];
        ws3.getRow(1).font = { bold: true };
        ws3.addRows(
          leaderboard.map((rep, i) => ({
            rank: i + 1,
            name: rep.name,
            assigned: rep.leadsAssigned,
            converted: rep.leadsConverted,
            revenue: `₹${rep.totalRevenue.toLocaleString("en-IN")}`,
            score: rep.score,
          })),
        );
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `crm-report-${period}-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Report downloaded");
    } catch {
      toast.error("Failed to export report");
    }
  }, [stats, dealStats, sourceReport, leaderboard, period]);

  const activityTotals = useMemo(() => {
    if (!leaderboard?.length) return { calls: 0, emails: 0, meetings: 0 };
    return leaderboard.reduce(
      (acc, rep) => ({
        calls: acc.calls + rep.totalCalls,
        emails: acc.emails + rep.totalEmails,
        meetings: acc.meetings + rep.totalMeetings,
      }),
      { calls: 0, emails: 0, meetings: 0 },
    );
  }, [leaderboard]);

  const maxPipelineCount = useMemo(() => {
    if (!stats) return 1;
    return Math.max(1, ...Object.values(stats.byStatus));
  }, [stats]);

  const periodLabel =
    PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? "This Month";

  if (isLoading) {
    return (
      <PageWrapper
        title="Reports"
        subtitle="Sales performance and pipeline analytics"
      >
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3.5 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper
        title="Reports"
        subtitle="Sales performance and pipeline analytics"
      >
        <div className="flex flex-1 h-full flex-col items-center justify-center gap-3 text-center py-16">
          <AlertTriangle className="h-10 w-10 text-destructive/60" />
          <p className="text-sm font-medium">Failed to load report data</p>
          <p className="text-xs text-muted-foreground">
            Check your connection and try again.
          </p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Retry
          </Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Reports"
      subtitle="Sales performance and pipeline analytics"
      filters={
        <div className="flex items-center gap-1.5">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              data-period={opt.value}
              variant={period === opt.value ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-7 text-xs px-3",
                period === opt.value &&
                  "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-md hover:from-violet-700 hover:to-indigo-700",
              )}
              onClick={handlePeriodButtonClick}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      }
      actions={
        <Button
          onClick={handleExport}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
        >
          <FileDown className="h-4 w-4 mr-2" />
          Export
        </Button>
      }
    >
      <motion.div
        className="space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {slaData && slaData.total > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="border-red-500/20 bg-red-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-red-500">
                  <AlertTriangle className="h-4 w-4" />
                  SLA Breached — {slaData.total} leads not contacted in 24h+
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[160px] overflow-y-auto">
                  {slaData.leads.slice(0, 8).map((lead) => (
                    <div
                      key={lead.leadId}
                      className="flex items-center justify-between p-2 rounded-lg bg-background/60 border border-red-500/10"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-sm font-medium truncate">
                          {lead.leadName}
                        </span>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {lead.status}
                        </Badge>
                        {lead.priority && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] shrink-0",
                              lead.priority === "HOT" &&
                                "border-red-500/50 text-red-500",
                              lead.priority === "WARM" &&
                                "border-amber-500/50 text-amber-500",
                              lead.priority === "COLD" &&
                                "border-blue-400/50 text-blue-400",
                            )}
                          >
                            {lead.priority}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 ml-3">
                        <Clock className="h-3 w-3" />
                        {lead.hoursSinceUpdate}h overdue
                        {lead.assignedTo && (
                          <span className="hidden sm:inline">
                            · {lead.assignedTo}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div variants={fadeUp}>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-foreground">
              Pipeline Overview
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {periodLabel}
            </p>
          </div>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Leads"
              value={stats?.total ?? 0}
              icon={Users}
              color="blue"
              index={0}
              hint={`${stats?.thisMonth ?? 0} new this month`}
            />
            <StatCard
              label="Active Deals"
              value={dealStats?.active ?? 0}
              icon={Target}
              color="violet"
              index={1}
            />
            <StatCard
              label="Pipeline Value"
              value={
                dealStats ? formatCurrency(dealStats.pipelineValue) : "—"
              }
              icon={BarChart3}
              color="cyan"
              index={2}
            />
            <StatCard
              label="Won Revenue"
              value={dealStats ? formatCurrency(dealStats.wonValue) : "—"}
              icon={DollarSign}
              color="green"
              index={3}
            />
          </div>
        </motion.div>

        {stats && (
          <motion.div variants={fadeUp}>
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-violet-600" />
                  Conversion Funnel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-1.5 py-2">
                  {FUNNEL_STAGES.map((status, i, arr) => {
                    const count = stats.byStatus[status] ?? 0;
                    const maxCount = stats.byStatus.NEW || 1;
                    const widthPct = Math.max(18, (count / maxCount) * 100);
                    const config = PIPELINE_COLORS[status];
                    const prevCount =
                      i === 0
                        ? stats.total
                        : (stats.byStatus[arr[i - 1]] ?? count);
                    const convPct =
                      prevCount > 0
                        ? ((count / prevCount) * 100).toFixed(0)
                        : "0";

                    return (
                      <motion.div
                        key={status}
                        className="flex flex-col items-center w-full"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.08, duration: 0.3 }}
                      >
                        <div
                          className="h-11 rounded-lg flex items-center justify-between px-4 gap-3 w-full max-w-full transition-all"
                          style={{
                            maxWidth: `${widthPct}%`,
                            backgroundColor: config.color + "1A",
                            borderLeft: `3px solid ${config.color}`,
                          }}
                        >
                          <span
                            className="text-sm font-semibold capitalize whitespace-nowrap"
                            style={{ color: config.color }}
                          >
                            {status.charAt(0) + status.slice(1).toLowerCase()}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {count}
                            </Badge>
                            {i > 0 && (
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {convPct}% conv.
                              </span>
                            )}
                          </div>
                        </div>
                        {i < arr.length - 1 && (
                          <ArrowDown className="h-3.5 w-3.5 text-muted-foreground/30 my-0.5" />
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div variants={fadeUp}>
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-violet-600" />
                Source Attribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {sourceLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !sourceReport?.sources?.length ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <BarChart3 className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No source data available
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">Leads</TableHead>
                        <TableHead className="text-right">Converted</TableHead>
                        <TableHead className="text-right">Win Rate</TableHead>
                        <TableHead className="text-right">Avg Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sourceReport.sources.map((src) => (
                        <TableRow key={src.source}>
                          <TableCell className="font-medium capitalize">
                            {src.source.replace(/_/g, " ")}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {src.count}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-emerald-600">
                            {src.converted}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <span
                              className={cn(
                                "font-medium",
                                src.conversionRate >= 50
                                  ? "text-emerald-600"
                                  : src.conversionRate >= 25
                                    ? "text-amber-600"
                                    : "text-muted-foreground",
                              )}
                            >
                              {src.conversionRate.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {src.count > 0
                              ? formatCurrency(
                                  Math.round(src.totalValue / src.count),
                                )
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Team Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {leaderboardLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !leaderboard?.length ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <UserCheck className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No team data available
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Rank</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-right">Leads</TableHead>
                        <TableHead className="text-right">Converted</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Conv. Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboard.map((rep, i) => {
                        const convRate =
                          rep.leadsAssigned > 0
                            ? (
                                (rep.leadsConverted / rep.leadsAssigned) *
                                100
                              ).toFixed(1)
                            : "0.0";

                        return (
                          <TableRow key={rep.userId}>
                            <TableCell className="font-medium">
                              <span
                                className={cn(
                                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                                  i === 0 && "bg-amber-100 text-amber-700",
                                  i === 1 && "bg-slate-100 text-slate-600",
                                  i === 2 && "bg-orange-100 text-orange-700",
                                  i > 2 && "text-muted-foreground",
                                )}
                              >
                                {i + 1}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">
                              {rep.name}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {rep.leadsAssigned}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-emerald-600">
                              {rep.leadsConverted}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(rep.totalRevenue)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={cn(
                                  "text-xs font-medium",
                                  Number(convRate) >= 50
                                    ? "text-emerald-600"
                                    : Number(convRate) >= 25
                                      ? "text-amber-600"
                                      : "text-muted-foreground",
                                )}
                              >
                                {convRate}%
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-foreground">
              Activity Summary
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {periodLabel} totals across all reps
            </p>
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <StatCard
              label="Calls"
              value={
                leaderboard
                  ? activityTotals.calls.toLocaleString()
                  : "—"
              }
              icon={Phone}
              color="blue"
              index={0}
            />
            <StatCard
              label="Emails"
              value={
                leaderboard
                  ? activityTotals.emails.toLocaleString()
                  : "—"
              }
              icon={Mail}
              color="violet"
              index={1}
            />
            <StatCard
              label="Meetings"
              value={
                leaderboard
                  ? activityTotals.meetings.toLocaleString()
                  : "—"
              }
              icon={Video}
              color="amber"
              index={2}
            />
          </div>
        </motion.div>

        {stats && (
          <motion.div variants={fadeUp}>
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  Pipeline Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.byStatus).map(([status, count]) => {
                    const pct =
                      stats.total > 0 ? (count / stats.total) * 100 : 0;
                    const config =
                      PIPELINE_COLORS[status] ?? PIPELINE_COLORS.NEW;

                    return (
                      <motion.div key={status} variants={scaleIn}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: config.color }}
                            />
                            <span className="text-sm font-medium capitalize">
                              {status.toLowerCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold tabular-nums">
                              {count}
                            </span>
                            <span className="text-xs text-muted-foreground w-12 text-right">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div
                          className="h-2.5 rounded-full bg-muted overflow-hidden"
                          role="progressbar"
                          aria-valuenow={count}
                          aria-valuemin={0}
                          aria-valuemax={maxPipelineCount}
                          aria-label={`${status} pipeline count`}
                        >
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: config.color }}
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(count / maxPipelineCount) * 100}%`,
                            }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </PageWrapper>
  );
}
