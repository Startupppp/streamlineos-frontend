"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  DollarSign,
  Percent,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  useRevenueAnalytics,
  type TimeSeriesPoint,
} from "@/hooks/api/revenue-analytics";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Period = "3m" | "6m" | "12m";

const TAB_IDS = ["executive", "finance", "growth", "sales"] as const;
type TabId = (typeof TAB_IDS)[number];

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function isTabId(value: string): value is TabId {
  return (TAB_IDS as readonly string[]).includes(value);
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  variant?: "default" | "highlight" | "danger";
}

function MetricCard({
  label,
  value,
  icon: Icon,
  variant = "default",
}: MetricCardProps) {
  const cardClass =
    variant === "highlight"
      ? "border-primary/30 bg-primary/5"
      : variant === "danger"
        ? "border-destructive/30 bg-destructive/5"
        : "border-border bg-card";
  return (
    <div className={`rounded-lg border px-4 py-3 ${cardClass}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
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
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
          No data for selected period
        </div>
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

function CardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-24" />
    </div>
  );
}

export default function RevenueAnalyticsPage() {
  const [period, setPeriod] = useState<Period>("6m");
  const [activeTab, setActiveTab] = useState<TabId>("executive");
  const { data, isLoading } = useRevenueAnalytics(period);

  const metrics = data?.metrics;
  const timeSeries = data?.timeSeries ?? [];

  function handleTabChange(value: string) {
    if (isTabId(value)) {
      setActiveTab(value);
    }
  }

  return (
    <PageWrapper title="Revenue Analytics" subtitle="Platform revenue metrics">
      <div className="space-y-4">
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

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 9 }).map((_, i) => <CardSkeleton key={i} />)
          ) : (
            <>
              <MetricCard
                label="MRR"
                value={fmt(metrics?.mrr ?? 0)}
                icon={DollarSign}
              />
              <MetricCard
                label="ARR"
                value={fmt(metrics?.arr ?? 0)}
                icon={TrendingUp}
              />
              <MetricCard
                label="ARPU"
                value={fmt(metrics?.arpu ?? 0)}
                icon={DollarSign}
              />
              <MetricCard
                label="Active Subscriptions"
                value={String(metrics?.activeSubscriptions ?? 0)}
                icon={Users}
              />
              <MetricCard
                label="Trial Subscriptions"
                value={String(metrics?.trialSubscriptions ?? 0)}
                icon={Users}
              />
              <MetricCard
                label="Churn Rate"
                value={`${metrics?.churnRate ?? 0}%`}
                icon={Percent}
              />
              <MetricCard
                label="LTV"
                value={fmt(metrics?.ltv ?? 0)}
                icon={TrendingUp}
              />
              <MetricCard
                label="Expansion Revenue"
                value={fmt(metrics?.expansionRevenue ?? 0)}
                icon={ArrowUpRight}
              />
              <MetricCard
                label="Trial Conversion Rate"
                value={`${metrics?.trialConversionRate ?? 0}%`}
                icon={RefreshCw}
              />
            </>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Risk
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <CardSkeleton />
            ) : (
              <MetricCard
                label="Refund Rate"
                value={`${metrics?.refundRate ?? 0}%`}
                icon={AlertTriangle}
                variant="danger"
              />
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="executive">Executive</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
            <TabsTrigger value="growth">Growth</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
          </TabsList>

          <TabsContent value="executive" className="space-y-3 mt-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard
                label="ARR"
                value={fmt(metrics?.arr ?? 0)}
                icon={TrendingUp}
                variant="highlight"
              />
              <MetricCard
                label="Active Subscriptions"
                value={String(metrics?.activeSubscriptions ?? 0)}
                icon={Users}
                variant="highlight"
              />
              <MetricCard
                label="LTV"
                value={fmt(metrics?.ltv ?? 0)}
                icon={TrendingUp}
                variant="highlight"
              />
            </div>
            <MrrChart
              timeSeries={timeSeries}
              isLoading={isLoading}
              title="MRR Trend"
            />
          </TabsContent>

          <TabsContent value="finance" className="space-y-3 mt-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard
                label="Churn Rate"
                value={`${metrics?.churnRate ?? 0}%`}
                icon={Percent}
                variant="danger"
              />
              <MetricCard
                label="Refund Rate"
                value={`${metrics?.refundRate ?? 0}%`}
                icon={AlertTriangle}
                variant="danger"
              />
              <MetricCard
                label="Expansion Revenue"
                value={fmt(metrics?.expansionRevenue ?? 0)}
                icon={ArrowUpRight}
                variant="highlight"
              />
            </div>
            <MrrChart
              timeSeries={timeSeries}
              isLoading={isLoading}
              title="MRR Trend — New vs Churned"
            />
          </TabsContent>

          <TabsContent value="growth" className="space-y-3 mt-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard
                label="Trial Conversion Rate"
                value={`${metrics?.trialConversionRate ?? 0}%`}
                icon={RefreshCw}
                variant="highlight"
              />
              <MetricCard
                label="Trial Subscriptions"
                value={String(metrics?.trialSubscriptions ?? 0)}
                icon={Users}
              />
              <MetricCard
                label="Expansion Revenue"
                value={fmt(metrics?.expansionRevenue ?? 0)}
                icon={ArrowUpRight}
                variant="highlight"
              />
            </div>
            <MrrChart
              timeSeries={timeSeries}
              isLoading={isLoading}
              title="New vs Churned MRR"
            />
          </TabsContent>

          <TabsContent value="sales" className="space-y-3 mt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard
                label="ARPU"
                value={fmt(metrics?.arpu ?? 0)}
                icon={DollarSign}
                variant="highlight"
              />
              <MetricCard
                label="Active Subscriptions"
                value={String(metrics?.activeSubscriptions ?? 0)}
                icon={Users}
                variant="highlight"
              />
            </div>
            <MrrChart
              timeSeries={timeSeries}
              isLoading={isLoading}
              title="MRR Growth"
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}
