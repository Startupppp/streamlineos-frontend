"use client";

import { useState, useCallback, useMemo, type ComponentType } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
} from "@/features/hr/analytics/shared";
import { DrilldownSheet } from "./drilldown-sheet";
import { TruncatedText } from "@/components/ui/truncated-text";

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
      className={onClick ? "hover:bg-muted/30 cursor-pointer" : undefined}
    />
  );

  if (!onClick) return card;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="cursor-pointer"
    >
      {card}
    </div>
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
    openDrilldown("leave", "Leave Trends");
  }

  function handleEngagementDrilldown() {
    openDrilldown("attendance", "Attendance Records");
  }

  function handleComplianceDrilldown() {
    openDrilldown("cases", "Compliance Cases");
  }

  if (kpisLoading) return <SectionSkeleton rows={8} />;

  return (
    <div className="space-y-6">
      <StatCardGrid cols={4}>
        <DrillableStatCard
          label="Active Employees"
          value={String(kpis?.headcount.active ?? 0)}
          hint={`${kpis?.headcount.probation ?? 0} probation · ${kpis?.headcount.notice ?? 0} notice`}
          icon={Users}
          tone="blue"
        />
        <DrillableStatCard
          label="12-Mo Attrition"
          value={formatPct(kpis?.attritionRate12mo ?? 0)}
          icon={TrendingDown}
          tone="red"
          onClick={handleAttritionDrilldown}
        />
        <DrillableStatCard
          label="Avg Tenure"
          value={formatTenure(kpis?.avgTenureMonths ?? 0)}
          icon={Clock}
        />
        <DrillableStatCard
          label="Leave Utilization"
          value={formatPct(kpis?.leaveUtilizationPct ?? 0)}
          icon={Target}
          tone="blue"
          onClick={handleLeaveDrilldown}
        />
        <DrillableStatCard
          label="Attendance Rate"
          value={formatPct(kpis?.attendanceRatePct ?? 0)}
          icon={CheckCircle}
          tone="emerald"
        />
        <DrillableStatCard
          label="Open Cases"
          value={String(kpis?.openCasesCount ?? 0)}
          icon={AlertTriangle}
          tone="amber"
          onClick={handleComplianceDrilldown}
        />
        <DrillableStatCard
          label="Avg Mood Score"
          value={kpis?.avgMood !== null && kpis?.avgMood !== undefined ? kpis.avgMood.toFixed(1) : "—"}
          hint="out of 5"
          icon={Shield}
          tone="blue"
          onClick={handleEngagementDrilldown}
        />
        {canViewPayroll && kpis?.payrollCostLastMonth !== null ? (
          <DrillableStatCard
            label="Payroll Last Month"
            value={kpis?.payrollCostLastMonth !== null && kpis?.payrollCostLastMonth !== undefined ? formatCurrency(kpis.payrollCostLastMonth) : "—"}
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
                  View Details
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
                  View Details
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
                  View Details
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
            <>
              <PerformanceDistChart data={perfDist.distribution} />
              <div className="mt-2 flex justify-end">
                <Button variant="ghost" size="sm" onClick={handleAttritionDrilldown}>
                  View Attrition Details
                </Button>
              </div>
            </>
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
                  View Details
                </Button>
              </div>
            </>
          )}
        </AnalyticsChartCard>

        {canViewPayroll ? (
          <AnalyticsChartCard title="Payroll Cost Trend">
            {payrollLoading ? (
              <SectionSkeleton rows={8} />
            ) : !payrollCost?.monthly.length ? (
              <EmptyChart label="No payroll data" />
            ) : (
              <>
                <PayrollCostChart data={payrollCost.monthly} formatCurrency={formatCurrency} />
                <div className="mt-2 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={handleLeaveDrilldown}>
                    View Leave Details
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
