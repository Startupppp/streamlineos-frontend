"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users,
  IndianRupee,
  Target,
  Percent,
  TrendingUp,
  Award,
} from "lucide-react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useLeadStats,
  useLeads,
  useLeadAnalyticsSummary,
  useSalesLeaderboard,
} from "@/hooks/api/leads";
import { useDeals } from "@/hooks/api/crm";
import { useTaskAnalytics } from "@/hooks/api/tasks";
import { useSlaReport } from "@/hooks/api/crm-settings";
import {
  useSalesDashboardKPIs,
  useRevenueVsGoal,
} from "@/hooks/api/crm/analytics";
import {
  CHART_TOOLTIP_STYLE,
  AXIS_TICK,
  CHART_COLORS,
} from "@/features/crm/shared/constants";
import { PipelineFunnelChart } from "@/features/crm/analytics/pipeline-funnel-chart";
import { SourceBreakdownChart } from "@/features/crm/analytics/source-breakdown-chart";
import { RepPerformanceTable } from "@/features/crm/analytics/rep-performance-table";
import { LeadVolumeChart } from "@/features/crm/analytics/lead-volume-chart";
import { ConversionChart } from "@/features/crm/analytics/conversion-chart";
import { DealValueChart } from "@/features/crm/analytics/deal-value-chart";
import { AnalyticsChartCard } from "@/features/crm/analytics/analytics-chart-card";
import { EmptyChart } from "@/features/crm/analytics/empty-chart";

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

function periodToDateRange(period: Period): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().split("T")[0];

  if (period === "week") {
    const from = new Date(now);
    from.setDate(now.getDate() - 7);
    return { from: from.toISOString().split("T")[0], to };
  }
  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: from.toISOString().split("T")[0], to };
  }
  if (period === "quarter") {
    const from = new Date(now);
    from.setMonth(now.getMonth() - 3);
    return { from: from.toISOString().split("T")[0], to };
  }
  const from = new Date(now.getFullYear(), 0, 1);
  return { from: from.toISOString().split("T")[0], to };
}

export default function CrmAnalyticsPage() {
  const [period, setPeriod] = useState<Period>("month");

  const dateRange = useMemo(() => periodToDateRange(period), [period]);

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

  const { data: leadStats, isLoading: statsLoading } = useLeadStats({
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
  });
  const { data: allDeals, isLoading: dealsLoading } = useDeals();
  const { data: leaderboard, isLoading: leaderLoading } = useSalesLeaderboard();
  const { data: slaReport, isLoading: slaLoading } = useSlaReport();
  const { data: allLeadsResult, isLoading: leadsLoading } = useLeads({
    limit: 100,
  });
  const allLeads = allLeadsResult?.leads;
  const { data: taskAnalytics } = useTaskAnalytics(30);

  const { data: analyticsSummary, isLoading: summaryLoading } =
    useLeadAnalyticsSummary({
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
    });

  const { data: kpis } = useSalesDashboardKPIs({
    from: dateRange.from,
    to: dateRange.to,
  });

  const { data: revenueVsGoal, isLoading: revenueGoalLoading } =
    useRevenueVsGoal(new Date().getFullYear());

  const isLoading =
    statsLoading ||
    dealsLoading ||
    leaderLoading ||
    slaLoading ||
    leadsLoading ||
    summaryLoading;

  const funnelData = useMemo(() => {
    if (!leadStats) return [];
    return [
      { name: "New", value: leadStats.byStatus.NEW, fill: "#3B82F6" },
      { name: "Contacted", value: leadStats.byStatus.CONTACTED, fill: "#0EA5E9" },
      { name: "Interested", value: leadStats.byStatus.INTERESTED, fill: "#F59E0B" },
      { name: "Qualified", value: leadStats.byStatus.QUALIFIED, fill: "#8B5CF6" },
      { name: "Converted", value: leadStats.byStatus.CONVERTED, fill: "#10B981" },
    ].filter((s) => s.value > 0);
  }, [leadStats]);

  const leadVolumeTrend = useMemo(() => {
    if (!allLeads) return [];
    const weeks: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      weeks[`W${12 - i}`] = 0;
    }
    const now = new Date();
    allLeads.forEach((lead) => {
      const diffDays = Math.floor(
        (now.getTime() - new Date(lead.createdAt!).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const weekIndex = Math.floor(diffDays / 7);
      if (weekIndex < 12) {
        const key = `W${12 - weekIndex}`;
        if (weeks[key] !== undefined) weeks[key]++;
      }
    });
    return Object.entries(weeks).map(([week, leads]) => ({ week, leads }));
  }, [allLeads]);

  const sourceBreakdown = useMemo(() => {
    if (!allLeads) return [];
    const map: Record<string, number> = {};
    allLeads.forEach((l) => {
      const src = l.source?.replace(/_/g, " ") ?? "unknown";
      map[src] = (map[src] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [allLeads]);

  const dealsByStageValue = useMemo(() => {
    if (!allDeals) return [];
    const map: Record<string, number> = {};
    allDeals.forEach((d) => {
      map[d.stage] = (map[d.stage] ?? 0) + Number(d.value ?? 0);
    });
    return Object.entries(map).map(([stage, value]) => ({
      stage,
      value: Math.round(value / 100000),
    }));
  }, [allDeals]);

  const wonLostReasons = useMemo(() => {
    if (!allDeals) return [];
    const won = allDeals.filter((d) => d.stage === "WON").length;
    const lost = allDeals.filter((d) => d.stage === "LOST").length;
    const data = [];
    if (won > 0) data.push({ name: "Won", value: won });
    if (lost > 0) data.push({ name: "Lost", value: lost });
    return data;
  }, [allDeals]);

  const scoreDistribution = useMemo(() => {
    if (!allLeads) return [];
    const buckets = { "0–20": 0, "21–40": 0, "41–60": 0, "61–80": 0, "81–100": 0 };
    allLeads.forEach((l) => {
      const score = l.score ?? 0;
      if (score <= 20) buckets["0–20"]++;
      else if (score <= 40) buckets["21–40"]++;
      else if (score <= 60) buckets["41–60"]++;
      else if (score <= 80) buckets["61–80"]++;
      else buckets["81–100"]++;
    });
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [allLeads]);

  const revenueGoalData = useMemo(() => {
    if (!revenueVsGoal) return [];
    return revenueVsGoal.map((m) => ({
      month: m.month,
      actual: Math.round(m.actual / 100000),
      target: Math.round(m.target / 100000),
    }));
  }, [revenueVsGoal]);

  if (isLoading) {
    return (
      <PageWrapper
        title="CRM Analytics"
        subtitle="Pipeline insights and performance metrics"
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-3.5 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-36" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[280px] w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="CRM Analytics"
      subtitle="Pipeline insights and performance metrics"
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
    >
      <motion.div
        className="space-y-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {analyticsSummary && (
          <motion.div
            variants={fadeUp}
            className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          >
            <StatCard
              label="Total Leads"
              value={analyticsSummary.totalLeads}
              icon={Users}
              index={0}
              trend={
                analyticsSummary.totalLeadsPrevPeriod > 0
                  ? {
                      value: Math.round(
                        ((analyticsSummary.totalLeads -
                          analyticsSummary.totalLeadsPrevPeriod) /
                          analyticsSummary.totalLeadsPrevPeriod) *
                          100,
                      ),
                      isPositive:
                        analyticsSummary.totalLeads >=
                        analyticsSummary.totalLeadsPrevPeriod,
                    }
                  : undefined
              }
            />
            <StatCard
              label="Conversion Rate"
              value={`${analyticsSummary.conversionRate}%`}
              icon={Percent}
              index={1}
              trend={
                analyticsSummary.conversionRatePrevPeriod > 0
                  ? {
                      value: Math.abs(
                        Math.round(
                          analyticsSummary.conversionRate -
                            analyticsSummary.conversionRatePrevPeriod,
                        ),
                      ),
                      isPositive:
                        analyticsSummary.conversionRate >=
                        analyticsSummary.conversionRatePrevPeriod,
                    }
                  : undefined
              }
            />
            <StatCard
              label="Total Revenue"
              value={`₹${(analyticsSummary.totalRevenue / 100000).toFixed(1)}L`}
              icon={IndianRupee}
              index={2}
            />
            <StatCard
              label={kpis ? "Deal Win Rate" : "Active Reps"}
              value={
                kpis
                  ? `${kpis.closeRate.toFixed(1)}%`
                  : analyticsSummary.assignmentDistribution.length
              }
              icon={kpis ? Award : Target}
              index={3}
              trend={
                kpis && kpis.prevCloseRate > 0
                  ? {
                      value: Math.abs(
                        Math.round(kpis.closeRate - kpis.prevCloseRate),
                      ),
                      isPositive: kpis.closeRate >= kpis.prevCloseRate,
                    }
                  : undefined
              }
            />
          </motion.div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <PipelineFunnelChart data={funnelData} />
          <LeadVolumeChart data={leadVolumeTrend} />
          <SourceBreakdownChart data={sourceBreakdown} />
          <RepPerformanceTable leaderboard={leaderboard} />
          <ConversionChart data={wonLostReasons} />
          <DealValueChart data={dealsByStageValue} />

          <AnalyticsChartCard
            title="SLA Compliance Rate"
            data={[]}
            filename="sla-compliance"
          >
            {!slaReport ? (
              <EmptyChart message="No SLA data available" />
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px]">
                <div className="relative h-40 w-40">
                  <svg
                    viewBox="0 0 100 100"
                    className="h-full w-full -rotate-90"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="hsl(var(--border))"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke={
                        slaReport.complianceRate >= 80
                          ? "#10B981"
                          : slaReport.complianceRate >= 50
                            ? "#F59E0B"
                            : "#EF4444"
                      }
                      strokeWidth="8"
                      strokeDasharray={`${slaReport.complianceRate * 2.64} 264`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">
                      {slaReport.complianceRate}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Compliant
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-xs justify-center">
                  <span className="text-muted-foreground">
                    Total: {slaReport.total}
                  </span>
                  <span className="text-emerald-500">
                    Met: {slaReport.compliant}
                  </span>
                  <span className="text-red-500">
                    Breached: {slaReport.breached}
                  </span>
                </div>
              </div>
            )}
          </AnalyticsChartCard>

          <AnalyticsChartCard
            title="Score Distribution"
            data={scoreDistribution}
            filename="score-distribution"
          >
            {scoreDistribution.every((b) => b.count === 0) ? (
              <EmptyChart message="No scored leads yet" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={scoreDistribution}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis dataKey="range" tick={AXIS_TICK} />
                  <YAxis tick={AXIS_TICK} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {scoreDistribution.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </AnalyticsChartCard>

          {analyticsSummary &&
            analyticsSummary.assignmentDistribution.length > 0 && (
              <AnalyticsChartCard
                title="Lead Assignment Distribution"
                data={analyticsSummary.assignmentDistribution}
                filename="assignment-distribution"
              >
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={analyticsSummary.assignmentDistribution}
                    layout="vertical"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis type="number" tick={AXIS_TICK} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={AXIS_TICK}
                      width={100}
                    />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </AnalyticsChartCard>
            )}

          {analyticsSummary &&
            analyticsSummary.conversionBySource.length > 0 && (
              <AnalyticsChartCard
                title="Conversion Rate by Source"
                data={analyticsSummary.conversionBySource}
                filename="conversion-by-source"
              >
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={analyticsSummary.conversionBySource}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="source"
                      tick={{ ...AXIS_TICK, fontSize: 10 }}
                    />
                    <YAxis tick={AXIS_TICK} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Bar
                      dataKey="total"
                      name="Total"
                      fill="#94A3B8"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="converted"
                      name="Converted"
                      fill="#10B981"
                      radius={[4, 4, 0, 0]}
                    />
                    <Legend />
                  </BarChart>
                </ResponsiveContainer>
              </AnalyticsChartCard>
            )}

          {analyticsSummary && analyticsSummary.monthlyRevenue.length > 0 && (
            <AnalyticsChartCard
              title="Monthly Revenue Trend"
              data={analyticsSummary.monthlyRevenue}
              filename="monthly-revenue"
            >
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={analyticsSummary.monthlyRevenue}>
                  <defs>
                    <linearGradient
                      id="revenueGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis dataKey="month" tick={AXIS_TICK} />
                  <YAxis tick={AXIS_TICK} />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value) => [
                      `₹${(Number(value) / 100000).toFixed(1)}L`,
                      "Revenue",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fill="url(#revenueGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </AnalyticsChartCard>
          )}

          {!revenueGoalLoading && revenueGoalData.length > 0 && (
            <AnalyticsChartCard
              title="Revenue vs Goal (This Year)"
              data={revenueGoalData}
              filename="revenue-vs-goal"
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenueGoalData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis dataKey="month" tick={{ ...AXIS_TICK, fontSize: 10 }} />
                  <YAxis
                    tick={AXIS_TICK}
                    tickFormatter={(v) => `₹${v}L`}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value, name) => [
                      `₹${value}L`,
                      name === "actual" ? "Actual" : "Target",
                    ]}
                  />
                  <Legend
                    formatter={(value) =>
                      value === "actual" ? "Actual" : "Target"
                    }
                  />
                  <Bar dataKey="actual" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="target" fill="#E2E8F0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </AnalyticsChartCard>
          )}

          {kpis && (
            <AnalyticsChartCard
              title="Win Rate Trend"
              data={[
                {
                  period: "Previous",
                  winRate: Number(kpis.prevCloseRate.toFixed(1)),
                },
                {
                  period: "Current",
                  winRate: Number(kpis.closeRate.toFixed(1)),
                },
              ]}
              filename="win-rate-trend"
            >
              <div className="h-[280px] flex flex-col">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={[
                      {
                        period: "Previous",
                        winRate: Number(kpis.prevCloseRate.toFixed(1)),
                      },
                      {
                        period: "Current",
                        winRate: Number(kpis.closeRate.toFixed(1)),
                      },
                    ]}
                    margin={{ top: 16, right: 16, bottom: 8, left: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis dataKey="period" tick={AXIS_TICK} />
                    <YAxis
                      tick={AXIS_TICK}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(value) => [`${value}%`, "Win Rate"]}
                    />
                    <ReferenceLine
                      y={50}
                      stroke="#94A3B8"
                      strokeDasharray="4 4"
                      label={{
                        value: "50%",
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 10,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="winRate"
                      stroke="#8B5CF6"
                      strokeWidth={2.5}
                      dot={{ fill: "#8B5CF6", r: 5, strokeWidth: 2, stroke: "#fff" }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-8 pb-2">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-violet-600">
                      {kpis.closeRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Current win rate
                    </p>
                  </div>
                  {kpis.prevCloseRate > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-400">
                        {kpis.prevCloseRate.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Previous period
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </AnalyticsChartCard>
          )}
        </div>

        {taskAnalytics && (
          <motion.div variants={fadeUp}>
            <Card>
              <CardHeader className="px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-violet-600" />
                  <h3 className="text-sm font-semibold">
                    Task Analytics (Last 30 Days)
                  </h3>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">
                      {taskAnalytics.completionRate}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Completion Rate
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-destructive">
                      {taskAnalytics.overdue}
                    </p>
                    <p className="text-xs text-muted-foreground">Overdue</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{taskAnalytics.total}</p>
                    <p className="text-xs text-muted-foreground">Total Tasks</p>
                  </div>
                </div>
                {taskAnalytics.perRep.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Per Rep
                    </p>
                    {taskAnalytics.perRep.slice(0, 8).map((rep) => (
                      <div
                        key={rep.assigneeId}
                        className="flex items-center gap-3"
                      >
                        <p className="text-xs font-medium w-32 truncate shrink-0">
                          {rep.name}
                        </p>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                            style={{ width: `${rep.completionRate}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums w-10 text-right shrink-0">
                          {rep.completionRate}%
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums w-12 text-right shrink-0">
                          {rep.completed}/{rep.total}
                        </span>
                        {rep.overdue > 0 && (
                          <span className="text-[10px] text-destructive shrink-0">
                            {rep.overdue} late
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </PageWrapper>
  );
}
