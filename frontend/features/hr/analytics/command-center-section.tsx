"use client";

import { useState, useCallback, useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Target,
  Shield,
} from "lucide-react";
import { useCan } from "@/hooks/api/access";
import {
  useHrCommandCenter,
  useHrAttritionPlus,
  useHrLeaveTrends,
  useHrEngagement,
  useHrPerformanceDist,
  useHrComplianceGaps,
  useHrPayrollCost,
} from "@/hooks/api/hr/analytics";
import {
  AnalyticsChartCard,
  SectionSkeleton,
  EmptyChart,
  chartTooltipStyle,
  chartGridProps,
  chartAxisTick,
  CHART_SEMANTIC,
} from "@/features/hr/analytics/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DrilldownSheet } from "./drilldown-sheet";

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  onClick?: () => void;
}

function StatCard({ label, value, subtitle, icon: Icon, iconBg, iconColor, onClick }: StatCardProps) {
  return (
    <Card
      className={cn(
        "border-border/80 shadow-sm transition-shadow",
        onClick && "cursor-pointer hover:shadow-md",
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-start gap-3 p-4">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", iconBg)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-xl font-semibold tabular-nums text-foreground">{value}</p>
          {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(cents / 100);
}

function formatPct(val: number): string {
  return `${val.toFixed(1)}%`;
}

function formatTenure(months: number): string {
  return `${months.toFixed(1)} mo`;
}

interface DrilldownState {
  open: boolean;
  metric: string;
  title: string;
}

interface CommandCenterSectionProps {
  departmentId?: number;
}

export function CommandCenterSection({ departmentId }: CommandCenterSectionProps) {
  const canViewPayroll = useCan("hr:payroll:view");

  const { data: kpis, isLoading: kpisLoading } = useHrCommandCenter(departmentId);
  const { data: attrition, isLoading: attritionLoading } = useHrAttritionPlus(departmentId);
  const { data: leaveTrends, isLoading: leaveLoading } = useHrLeaveTrends(departmentId);
  const { data: engagement, isLoading: engagementLoading } = useHrEngagement();
  const { data: perfDist, isLoading: perfLoading } = useHrPerformanceDist();
  const { data: complianceGaps, isLoading: complianceLoading } = useHrComplianceGaps(departmentId);
  const { data: payrollCost, isLoading: payrollLoading } = useHrPayrollCost();

  const [drilldown, setDrilldown] = useState<DrilldownState>({
    open: false,
    metric: "",
    title: "",
  });

  const openDrilldown = useCallback((metric: string, title: string) => {
    setDrilldown({ open: true, metric, title });
  }, []);

  const closeDrilldown = useCallback(() => {
    setDrilldown((prev) => ({ ...prev, open: false }));
  }, []);

  const leaveStackData = useMemo(() => {
    if (!leaveTrends) return [];
    const byMonth = new Map<string, Record<string, number>>();
    for (const row of leaveTrends.byTypeAndMonth) {
      const existing = byMonth.get(row.month) ?? {};
      existing[row.leaveTypeName] = (existing[row.leaveTypeName] ?? 0) + row.days;
      byMonth.set(row.month, existing);
    }
    return Array.from(byMonth.entries()).map(([month, types]) => ({ month, ...types }));
  }, [leaveTrends]);

  const leaveTypeKeys = useMemo(
    () => leaveTrends?.totalByType.map((t) => t.leaveTypeName) ?? [],
    [leaveTrends],
  );

  const leaveTypeColors = ["#1d4ed8", "#06b6d4", "#60a5fa", "#8b5cf6", "#10b981"];

  function handleAttritionDrilldown() {
    openDrilldown("attrition", "Attrition");
  }

  function handleLeaveDrilldown() {
    openDrilldown("leave-trends", "Leave Trends");
  }

  function handleEngagementDrilldown() {
    openDrilldown("engagement", "Engagement");
  }

  function handlePerformanceDrilldown() {
    openDrilldown("performance", "Performance Distribution");
  }

  function handleComplianceDrilldown() {
    openDrilldown("compliance", "Compliance Gaps");
  }

  function handlePayrollDrilldown() {
    openDrilldown("payroll-cost", "Payroll Cost");
  }

  if (kpisLoading) return <SectionSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Active Employees"
          value={String(kpis?.headcount.active ?? 0)}
          subtitle={`${kpis?.headcount.probation ?? 0} probation · ${kpis?.headcount.notice ?? 0} notice`}
          icon={Users}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          label="12-Mo Attrition"
          value={formatPct(kpis?.attritionRate12mo ?? 0)}
          icon={TrendingDown}
          iconBg="bg-red-50"
          iconColor="text-red-500"
          onClick={handleAttritionDrilldown}
        />
        <StatCard
          label="Avg Tenure"
          value={formatTenure(kpis?.avgTenureMonths ?? 0)}
          icon={Clock}
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
        />
        <StatCard
          label="Leave Utilization"
          value={formatPct(kpis?.leaveUtilizationPct ?? 0)}
          icon={Target}
          iconBg="bg-cyan-50"
          iconColor="text-cyan-600"
          onClick={handleLeaveDrilldown}
        />
        <StatCard
          label="Attendance Rate"
          value={formatPct(kpis?.attendanceRatePct ?? 0)}
          icon={CheckCircle}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          label="Open Cases"
          value={String(kpis?.openCasesCount ?? 0)}
          icon={AlertTriangle}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          onClick={handleComplianceDrilldown}
        />
        <StatCard
          label="Avg Mood Score"
          value={kpis?.avgMood !== null && kpis?.avgMood !== undefined ? kpis.avgMood.toFixed(1) : "—"}
          subtitle="out of 5"
          icon={Shield}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          onClick={handleEngagementDrilldown}
        />
        {canViewPayroll && kpis?.payrollCostLastMonth !== null ? (
          <StatCard
            label="Payroll Last Month"
            value={kpis?.payrollCostLastMonth !== null && kpis?.payrollCostLastMonth !== undefined ? formatCurrency(kpis.payrollCostLastMonth) : "—"}
            icon={DollarSign}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            onClick={handlePayrollDrilldown}
          />
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard title="Joins vs Exits (24 months)">
          {attritionLoading ? (
            <SectionSkeleton rows={3} />
          ) : !attrition?.joinsVsExits.length ? (
            <EmptyChart label="No attrition data" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={attrition.joinsVsExits}>
                  <defs>
                    <linearGradient id="joinGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_SEMANTIC.primary} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={CHART_SEMANTIC.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="exitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_SEMANTIC.danger} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={CHART_SEMANTIC.danger} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="month" tick={chartAxisTick} />
                  <YAxis tick={chartAxisTick} width={28} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="joins"
                    stroke={CHART_SEMANTIC.primary}
                    fill="url(#joinGrad)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="exits"
                    stroke={CHART_SEMANTIC.danger}
                    fill="url(#exitGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-2 flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleAttritionDrilldown}>
                  View Details
                </Button>
              </div>
            </>
          )}
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Leave Trends by Type">
          {leaveLoading ? (
            <SectionSkeleton rows={3} />
          ) : !leaveStackData.length ? (
            <EmptyChart label="No leave data" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={leaveStackData}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="month" tick={chartAxisTick} />
                  <YAxis tick={chartAxisTick} width={28} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {leaveTypeKeys.map((key, idx) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      stackId="a"
                      fill={leaveTypeColors[idx % leaveTypeColors.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleLeaveDrilldown}>
                  View Details
                </Button>
              </div>
            </>
          )}
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Mood Trend">
          {engagementLoading ? (
            <SectionSkeleton rows={3} />
          ) : !engagement?.moodByMonth.length ? (
            <EmptyChart label="No engagement data" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={engagement.moodByMonth}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="month" tick={chartAxisTick} />
                  <YAxis domain={[0, 5]} tick={chartAxisTick} width={28} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="avgMood"
                    stroke={CHART_SEMANTIC.accent}
                    strokeWidth={2}
                    dot={false}
                    name="Avg Mood"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-2 flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleEngagementDrilldown}>
                  View Details
                </Button>
              </div>
            </>
          )}
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Performance Distribution">
          {perfLoading ? (
            <SectionSkeleton rows={3} />
          ) : !perfDist?.distribution.length ? (
            <EmptyChart label="No performance data" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={perfDist.distribution}>
                  <CartesianGrid {...chartGridProps} />
                  <XAxis dataKey="rating" tick={chartAxisTick} label={{ value: "Rating", position: "insideBottom", offset: -2, style: { fontSize: 10 } }} />
                  <YAxis tick={chartAxisTick} width={28} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Bar dataKey="count" fill={CHART_SEMANTIC.primary} radius={[3, 3, 0, 0]} name="Employees" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 flex justify-end">
                <Button variant="ghost" size="sm" onClick={handlePerformanceDrilldown}>
                  View Details
                </Button>
              </div>
            </>
          )}
        </AnalyticsChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard title="Compliance Gaps by Category">
          {complianceLoading ? (
            <SectionSkeleton rows={4} />
          ) : !complianceGaps?.openCases.length ? (
            <EmptyChart label="No open compliance cases" />
          ) : (
            <>
              <div className="space-y-2">
                {complianceGaps.openCases.map((item) => (
                  <div key={item.category} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-muted-foreground">{item.category}</span>
                    <Badge variant="secondary" className="shrink-0 tabular-nums">
                      {item.count}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleComplianceDrilldown}>
                  View Details
                </Button>
              </div>
            </>
          )}
        </AnalyticsChartCard>

        {canViewPayroll ? (
          <AnalyticsChartCard title="Payroll Cost Trend">
            {payrollLoading ? (
              <SectionSkeleton rows={3} />
            ) : !payrollCost?.monthly.length ? (
              <EmptyChart label="No payroll data" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={payrollCost.monthly}>
                    <CartesianGrid {...chartGridProps} />
                    <XAxis dataKey="month" tick={chartAxisTick} />
                    <YAxis tick={chartAxisTick} width={40} tickFormatter={(v: number) => formatCurrency(v)} />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      formatter={(v: number) => [formatCurrency(v), "Gross Total"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="grossTotal"
                      stroke="#1d4ed8"
                      strokeWidth={2}
                      dot={false}
                      name="Gross Total"
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-2 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={handlePayrollDrilldown}>
                    View Details
                  </Button>
                </div>
              </>
            )}
          </AnalyticsChartCard>
        ) : null}
      </div>

      <DrilldownSheet
        open={drilldown.open}
        onClose={closeDrilldown}
        metric={drilldown.metric}
        title={drilldown.title}
        departmentId={departmentId}
      />
    </div>
  );
}
