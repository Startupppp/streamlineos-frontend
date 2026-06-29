"use client";

import { useState } from "react";
import { DollarSign, Percent, TrendingUp, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useRevenueAnalytics } from "@/hooks/api/revenue-analytics";
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

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export default function RevenueAnalyticsPage() {
  const [period, setPeriod] = useState<Period>("6m");
  const { data, isLoading } = useRevenueAnalytics(period);

  const metrics = data?.metrics;
  const timeSeries = data?.timeSeries ?? [];

  return (
    <PageWrapper title="Revenue Analytics" subtitle="Platform revenue metrics">
      <div className="space-y-4">
        <div className="flex gap-1.5">
          {(["3m", "6m", "12m"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
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
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card p-4 space-y-2"
              >
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))
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
            </>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-semibold mb-4">MRR Trend</p>
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
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
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
      </div>
    </PageWrapper>
  );
}
