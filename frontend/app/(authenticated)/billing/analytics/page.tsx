"use client";

import { useState } from "react";
import { type ComponentType } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  DollarSign,
  Percent,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  useRevenueAnalytics,
} from "@/hooks/api/revenue-analytics";
import dynamic from "next/dynamic";

const MrrChart = dynamic(
  () => import("@/features/billing/mrr-chart").then((m) => ({ default: m.MrrChart })),
  { ssr: false, loading: () => <Skeleton className="h-[200px] w-full rounded-lg" /> },
);

type Period = "3m" | "6m" | "12m";

const TAB_IDS = ["executive", "finance", "growth", "sales"] as const;
type TabId = (typeof TAB_IDS)[number];

function isTabId(value: string): value is TabId {
  return (TAB_IDS as readonly string[]).includes(value);
}

interface BillingMetricProps {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone?: "default" | "blue" | "emerald" | "amber" | "red";
}

function BillingMetric({ label, value, icon, tone = "default" }: BillingMetricProps) {
  return <StatCard label={label} value={value} icon={icon} tone={tone} />;
}

interface MrrChartProps {
  timeSeries: TimeSeriesPoint[];
  isLoading: boolean;
  title: string;
}

function MrrChart({ timeSeries, isLoading, title }: MrrChartProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-semibold mb-4">{title}</p>
      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : timeSeries.length === 0 ? (
        <ChartEmptyState message="No data for selected period" height={192} />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={timeSeries}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) =>
                `₹${(Number(v) / 100000).toFixed(0)}L`
              }
            />
            <Tooltip
              formatter={(v) => fmt(Number(v ?? 0))}
              labelClassName="text-xs"
              contentStyle={{ fontSize: 12 }}
            />
            <Bar
              dataKey="newMrr"
              name="New MRR"
              fill="hsl(var(--primary))"
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="churnMrr"
              name="Churned MRR"
              fill="hsl(var(--destructive))"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function createPeriodHandler(p: Period, setter: (period: Period) => void) {
  return function handlePeriodSelect() {
    setter(p);
  };
}

export default function RevenueAnalyticsPage() {
  const [period, setPeriod] = useState<Period>("6m");
  const [activeTab, setActiveTab] = useState<TabId>("executive");
  const { data, isLoading, isError, error, refetch } = useRevenueAnalytics(period);

  const metrics = data?.metrics;
  const timeSeries = data?.timeSeries ?? [];

  function handleTabChange(value: string) {
    if (isTabId(value)) {
      setActiveTab(value);
    }
  }

  function handleRetry() {
    void refetch();
  }

  return (
    <PageWrapper title="Revenue Analytics" subtitle="Platform revenue metrics">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {isError && (
          <ErrorState
            title="Failed to load analytics"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
            className="flex-1"
          />
        )}
        {!isError && <>
        <div className="flex gap-1.5">
          {(["3m", "6m", "12m"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={createPeriodHandler(p, setPeriod)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {p === "3m" ? "3 months" : p === "6m" ? "6 months" : "12 months"}
            </button>
          ))}
        </div>

        {isLoading ? (
          <StatCardGridSkeleton cols={3} />
        ) : (
          <StatCardGrid cols={3}>
              <BillingMetric
                label="MRR"
                value={fmt(metrics?.mrr ?? 0)}
                icon={DollarSign}
                tone="blue"
              />
              <BillingMetric
                label="ARR"
                value={fmt(metrics?.arr ?? 0)}
                icon={TrendingUp}
                tone="emerald"
              />
              <BillingMetric
                label="ARPU"
                value={fmt(metrics?.arpu ?? 0)}
                icon={DollarSign}
              />
              <BillingMetric
                label="Active Subscriptions"
                value={String(metrics?.activeSubscriptions ?? 0)}
                icon={Users}
                tone="blue"
              />
              <BillingMetric
                label="Trial Subscriptions"
                value={String(metrics?.trialSubscriptions ?? 0)}
                icon={Users}
                tone="amber"
              />
              <BillingMetric
                label="Churn Rate"
                value={`${metrics?.churnRate ?? 0}%`}
                icon={Percent}
                tone="red"
              />
              <BillingMetric
                label="LTV"
                value={fmt(metrics?.ltv ?? 0)}
                icon={TrendingUp}
                tone="emerald"
              />
              <BillingMetric
                label="Expansion Revenue"
                value={fmt(metrics?.expansionRevenue ?? 0)}
                icon={ArrowUpRight}
                tone="blue"
              />
              <BillingMetric
                label="Trial Conversion Rate"
                value={`${metrics?.trialConversionRate ?? 0}%`}
                icon={RefreshCw}
                tone="amber"
              />
          </StatCardGrid>
        )}

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Risk
          </p>
          {isLoading ? (
            <StatCardGridSkeleton cols={3} count={3} />
          ) : (
            <StatCardGrid cols={3}>
              <BillingMetric
                label="Refund Rate"
                value={`${metrics?.refundRate ?? 0}%`}
                icon={AlertTriangle}
                tone="red"
              />
            </StatCardGrid>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="executive">Executive</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
            <TabsTrigger value="growth">Growth</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
          </TabsList>

          <TabsContent value="executive" className="space-y-3 mt-3">
            <StatCardGrid cols={3}>
              <BillingMetric
                label="ARR"
                value={fmt(metrics?.arr ?? 0)}
                icon={TrendingUp}
                tone="emerald"
              />
              <BillingMetric
                label="Active Subscriptions"
                value={String(metrics?.activeSubscriptions ?? 0)}
                icon={Users}
                tone="blue"
              />
              <BillingMetric
                label="LTV"
                value={fmt(metrics?.ltv ?? 0)}
                icon={TrendingUp}
                tone="emerald"
              />
            </StatCardGrid>
            <MrrChart
              timeSeries={timeSeries}
              isLoading={isLoading}
              title="MRR Trend"
            />
          </TabsContent>

          <TabsContent value="finance" className="space-y-3 mt-3">
            <StatCardGrid cols={3}>
              <BillingMetric
                label="Churn Rate"
                value={`${metrics?.churnRate ?? 0}%`}
                icon={Percent}
                tone="red"
              />
              <BillingMetric
                label="Refund Rate"
                value={`${metrics?.refundRate ?? 0}%`}
                icon={AlertTriangle}
                tone="red"
              />
              <BillingMetric
                label="Expansion Revenue"
                value={fmt(metrics?.expansionRevenue ?? 0)}
                icon={ArrowUpRight}
                tone="blue"
              />
            </StatCardGrid>
            <MrrChart
              timeSeries={timeSeries}
              isLoading={isLoading}
              title="MRR Trend — New vs Churned"
            />
          </TabsContent>

          <TabsContent value="growth" className="space-y-3 mt-3">
            <StatCardGrid cols={3}>
              <BillingMetric
                label="Trial Conversion Rate"
                value={`${metrics?.trialConversionRate ?? 0}%`}
                icon={RefreshCw}
                tone="emerald"
              />
              <BillingMetric
                label="Trial Subscriptions"
                value={String(metrics?.trialSubscriptions ?? 0)}
                icon={Users}
                tone="amber"
              />
              <BillingMetric
                label="Expansion Revenue"
                value={fmt(metrics?.expansionRevenue ?? 0)}
                icon={ArrowUpRight}
                tone="blue"
              />
            </StatCardGrid>
            <MrrChart
              timeSeries={timeSeries}
              isLoading={isLoading}
              title="New vs Churned MRR"
            />
          </TabsContent>

          <TabsContent value="sales" className="space-y-3 mt-3">
            <StatCardGrid cols={2}>
              <BillingMetric
                label="ARPU"
                value={fmt(metrics?.arpu ?? 0)}
                icon={DollarSign}
                tone="blue"
              />
              <BillingMetric
                label="Active Subscriptions"
                value={String(metrics?.activeSubscriptions ?? 0)}
                icon={Users}
                tone="blue"
              />
            </StatCardGrid>
            <MrrChart
              timeSeries={timeSeries}
              isLoading={isLoading}
              title="MRR Growth"
            />
          </TabsContent>
        </Tabs>
        </>}
      </div>
    </PageWrapper>
  );
}
