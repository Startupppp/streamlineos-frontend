"use client";

import { useState, type ComponentType } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { format, parseISO, subDays } from "date-fns";
import {
  useCanViewOrganizationPayrollCost,
  useHrCommandCenter,
  useHrAttritionPlus,
  useHrLeaveTrends,
  useHrEngagement,
  useHrPerformanceDist,
  useHrComplianceGaps,
  useHrPayrollCost,
  type InsightRange,
} from "@/hooks/api/hr/analytics";
import type { HrCommandCenterData } from "@/hooks/api/hr/analytics-schema";
import {
  AnalyticsChartCard,
  SectionSkeleton,
  EmptyChart,
} from "@/features/hr/analytics/shared";
import { DrilldownSheet } from "./drilldown-sheet";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { formatMoneyCompact } from "@/lib/format-utils";
import { formatCalendarDate } from "@/lib/date-utils";
import { activationProps } from "@/lib/keyboard-activation";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";

const JoinsExitsChart = dynamic(
  () => import("./command-center-charts").then((m) => ({ default: m.JoinsExitsChart })),
  { ssr: false, loading: () => <Skeleton className="h-[200px] w-full" /> },
);
const LeaveStackChart = dynamic(
  () => import("./command-center-charts").then((m) => ({ default: m.LeaveStackChart })),
  { ssr: false, loading: () => <Skeleton className="h-[200px] w-full" /> },
);
const MoodTrendChart = dynamic(
  () => import("./command-center-charts").then((m) => ({ default: m.MoodTrendChart })),
  { ssr: false, loading: () => <Skeleton className="h-[200px] w-full" /> },
);
const PerformanceDistChart = dynamic(
  () => import("./command-center-charts").then((m) => ({ default: m.PerformanceDistChart })),
  { ssr: false, loading: () => <Skeleton className="h-[200px] w-full" /> },
);
const PayrollCostChart = dynamic(
  () => import("./command-center-charts").then((m) => ({ default: m.PayrollCostChart })),
  { ssr: false, loading: () => <Skeleton className="h-[200px] w-full" /> },
);

interface DrillableStatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  tone?: "default" | "blue" | "emerald" | "amber" | "red";
  onClick?: () => void;
}

function DrillableStatCard({ label, value, hint, icon, tone = "default", onClick }: DrillableStatCardProps) {
  const card = (
    <StatCard
      label={label}
      value={value}
      hint={hint}
      icon={icon}
      tone={tone}
      className={onClick ? "cursor-pointer hover:border-primary/30 hover:bg-muted/30" : undefined}
    />
  );

  if (!onClick) return card;

  return (
    <div
      {...activationProps(onClick, label)}
      className="h-full cursor-pointer rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2"
    >
      {card}
    </div>
  );
}


type InsightMetric = HrCommandCenterData["metrics"][keyof HrCommandCenterData["metrics"]];

const UNAVAILABLE = "—";

function formatPct(val: number): string {
  return `${val.toFixed(1)}%`;
}

function metricHint(metric: InsightMetric): string {
  if (metric.coverage === "unavailable") return "No data for this period";
  if (!metric.period) return "As of today";
  const lastDay = format(subDays(parseISO(metric.period.end), 1), "yyyy-MM-dd");
  return `${formatCalendarDate(metric.period.start)} – ${formatCalendarDate(lastDay)}`;
}

function metricValue(value: number | null, render: (value: number) => string): string {
  return value === null ? UNAVAILABLE : render(value);
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
  range: InsightRange;
  departmentId?: string;
}

export function CommandCenterSection({ range, departmentId }: CommandCenterSectionProps) {
  const canViewPayroll = useCanViewOrganizationPayrollCost();
  const display = useOrgDisplay();

  const {
    data: kpis,
    isLoading: kpisLoading,
    isError: kpisIsError,
    error: kpisError,
    refetch: refetchKpis,
  } = useHrCommandCenter({ departmentId, range });
  const { data: attrition, isLoading: attritionLoading } = useHrAttritionPlus(departmentId);
  const { data: leaveTrends, isLoading: leaveLoading } = useHrLeaveTrends(departmentId);
  const { data: engagement, isLoading: engagementLoading } = useHrEngagement();
  const { data: perfDist, isLoading: perfLoading } = useHrPerformanceDist();
  const { data: complianceGaps, isLoading: complianceLoading } = useHrComplianceGaps(departmentId);
  const { data: payrollCost, isLoading: payrollLoading } = useHrPayrollCost();
  const payrollDisplay = { ...display, currency: payrollCost?.currency ?? display.currency };
  function formatPayroll(amount: number | string): string {
    return formatMoneyCompact(amount, payrollDisplay);
  }
  const latestPayroll = payrollCost?.monthly[0];
  const payrollChartData = payrollCost?.monthly.map((row) => ({ month: row.month, grossTotal: Number(row.grossTotal) })).reverse() ?? [];

  const [drilldown, setDrilldown] = useState<DrilldownState>({
    open: false,
    metric: "",
    title: "",
  });

  function openDrilldown(metric: string, title: string) {
    setDrilldown({ open: true, metric, title });
  }

  function closeDrilldown() {
    setDrilldown((prev) => ({ ...prev, open: false }));
  }

  const leaveByMonth = new Map<string, Record<string, number>>();
  for (const row of leaveTrends?.byTypeAndMonth ?? []) {
    const existing = leaveByMonth.get(row.month) ?? {};
    existing[row.leaveTypeName] = (existing[row.leaveTypeName] ?? 0) + row.days;
    leaveByMonth.set(row.month, existing);
  }
  const leaveStackData = Array.from(leaveByMonth.entries()).map(([month, types]) => ({ month, ...types }));
  const leaveTypeKeys = leaveTrends?.totalByType.map((t) => t.leaveTypeName) ?? [];

  const leaveTypeColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--status-success-fill)"];

  function handleAttritionDrilldown() {
    openDrilldown("attrition", "Attrition");
  }

  function handleLeaveDrilldown() {
    openDrilldown("leave", "Leave Trends");
  }

  function handleEngagementDrilldown() {
    openDrilldown("attendance", "Attendance Records");
  }

  function handleComplianceDrilldown() {
    openDrilldown("cases", "Compliance Cases");
  }

  function handleRetryKpis(): void {
    void refetchKpis();
  }

  if (kpisLoading) return <SectionSkeleton rows={8} />;

  if (kpisIsError || !kpis) {
    return (
      <ErrorState
        title="Couldn't load the command centre"
        description={getErrorMessage(kpisError)}
        error={kpisError}
        onRetry={handleRetryKpis}
      />
    );
  }

  const metrics = kpis.metrics;

  return (
    <div className="space-y-6">
      <StatCardGrid cols={4}>
        <DrillableStatCard
          label="Active employees"
          value={metricValue(metrics.headcount.value?.active ?? null, String)}
          hint={metrics.headcount.value ? `${metrics.headcount.value.probation} probation · ${metrics.headcount.value.notice} notice · as of today` : metricHint(metrics.headcount)}
          icon={Users}
          tone="blue"
        />
        <DrillableStatCard
          label="Attrition"
          value={metricValue(metrics.attritionRate.value, formatPct)}
          hint={metricHint(metrics.attritionRate)}
          icon={TrendingDown}
          tone="red"
          onClick={handleAttritionDrilldown}
        />
        <DrillableStatCard
          label="Avg tenure"
          value={metricValue(metrics.avgTenureMonths.value, formatTenure)}
          hint={metricHint(metrics.avgTenureMonths)}
          icon={Clock}
        />
        <DrillableStatCard
          label="Leave utilization"
          value={metricValue(metrics.leaveUtilizationPct.value, formatPct)}
          hint={metricHint(metrics.leaveUtilizationPct)}
          icon={Target}
          tone="blue"
          onClick={handleLeaveDrilldown}
        />
        <DrillableStatCard
          label="Attendance rate"
          value={metricValue(metrics.attendanceRatePct.value, formatPct)}
          hint={metricHint(metrics.attendanceRatePct)}
          icon={CheckCircle}
          tone="emerald"
        />
        <DrillableStatCard
          label="Open cases"
          value={metricValue(metrics.openCasesCount.value, String)}
          hint={metricHint(metrics.openCasesCount)}
          icon={AlertTriangle}
          tone="amber"
          onClick={handleComplianceDrilldown}
        />
        <DrillableStatCard
          label="Avg mood score"
          value={metricValue(metrics.avgMood.value, (mood) => `${mood.toFixed(1)} / 5`)}
          hint={metricHint(metrics.avgMood)}
          icon={Shield}
          tone="blue"
          onClick={handleEngagementDrilldown}
        />
        {canViewPayroll && latestPayroll ? (
          <DrillableStatCard
            label={`Payroll gross · ${latestPayroll.month}`}
            value={formatPayroll(latestPayroll.grossTotal)}
            hint={payrollCost?.coverage === "partial" ? "Finalized runs only · some runs reopened" : "Finalized runs only"}
            icon={DollarSign}
            tone="blue"
          />
        ) : null}
      </StatCardGrid>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard title="Joins vs Exits (24 months)">
          {attritionLoading ? (
            <SectionSkeleton rows={8} />
          ) : !attrition?.joinsVsExits.length ? (
            <EmptyChart label="No attrition data" />
          ) : (
            <>
              <JoinsExitsChart data={attrition.joinsVsExits} />
              <div className="mt-2 flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleAttritionDrilldown}>
                  View attrition details
                </Button>
              </div>
            </>
          )}
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Leave Trends by Type">
          {leaveLoading ? (
            <SectionSkeleton rows={8} />
          ) : !leaveStackData.length ? (
            <EmptyChart label="No leave data" />
          ) : (
            <>
              <LeaveStackChart
                data={leaveStackData}
                leaveTypeKeys={leaveTypeKeys}
                leaveTypeColors={leaveTypeColors}
              />
              <div className="mt-2 flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleLeaveDrilldown}>
                  View leave details
                </Button>
              </div>
            </>
          )}
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Mood Trend">
          {engagementLoading ? (
            <SectionSkeleton rows={8} />
          ) : !engagement?.moodByMonth.length ? (
            <EmptyChart label="No engagement data" />
          ) : (
            <>
              <MoodTrendChart data={engagement.moodByMonth} />
              <div className="mt-2 flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleEngagementDrilldown}>
                  View mood details
                </Button>
              </div>
            </>
          )}
        </AnalyticsChartCard>

        <AnalyticsChartCard title="Performance Distribution">
          {perfLoading ? (
            <SectionSkeleton rows={8} />
          ) : !perfDist?.distribution.length ? (
            <EmptyChart label="No performance data" />
          ) : (
            <PerformanceDistChart data={perfDist.distribution} />
          )}
        </AnalyticsChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard title="Compliance Gaps by Category">
          {complianceLoading ? (
            <SectionSkeleton rows={8} />
          ) : !complianceGaps?.openCases.length ? (
            <EmptyChart label="No open compliance cases" />
          ) : (
            <>
              <div className="space-y-2">
                {complianceGaps.openCases.map((item) => (
                  <div key={item.category} className="flex items-center justify-between gap-2 text-sm">
                    <TruncatedText text={item.category} className="text-muted-foreground" />
                    <Badge variant="secondary" className="shrink-0 tabular-nums">
                      {item.count}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleComplianceDrilldown}>
                  View compliance details
                </Button>
              </div>
            </>
          )}
        </AnalyticsChartCard>

        {canViewPayroll ? (
          <AnalyticsChartCard title="Payroll Cost Trend">
            {payrollLoading ? (
              <SectionSkeleton rows={8} />
            ) : !payrollChartData.length ? (
              <EmptyChart label="No finalized payroll in the last 12 months" />
            ) : (
              <PayrollCostChart data={payrollChartData} formatCurrency={formatPayroll} />
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
