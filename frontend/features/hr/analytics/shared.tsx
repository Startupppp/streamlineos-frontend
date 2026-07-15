"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { cn } from "@/lib/utils";

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

export const PIE_COLORS = [...CHART_COLORS];

export const CHART_SEMANTIC = {
  primary: "var(--chart-1)",
  accent: "var(--chart-2)",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
} as const;

export const chartTooltipStyle = {
  fontSize: 12,
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.08)",
};

export const chartGridProps = {
  strokeDasharray: "3 3",
  stroke: "var(--border)",
  vertical: false,
};

export const chartAxisTick = {
  fontSize: 10,
  fill: "var(--muted-foreground)",
};

export function AnalyticsSectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-0.5">
      <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export function AnalyticsChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden border-border/80 shadow-sm", className)}>
      <CardHeader className="border-b border-border/50 bg-muted/30 px-4 py-3">
        <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

export function SectionSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <Skeleton className="h-4 w-32" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export function EmptyChart({ label }: { label: string }) {
  return <ChartEmptyState message={label} compact />;
}

export function SimpleBar({
  data,
}: {
  data: { label: string; value: number; color?: string }[];
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const barColor = item.color ?? CHART_COLORS[index % CHART_COLORS.length];
        const pct = Math.max(4, (item.value / max) * 100);

        return (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-muted-foreground">{item.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-foreground">
                {item.value}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted/80">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: barColor }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
