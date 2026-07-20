"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { formatCredits, formatTokens } from "@/lib/format-ai";
import type { AiCreditsUsageDaily } from "@/hooks/api/ai-credits";

const TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
} as const;

const AXIS_TICK = { fill: "hsl(var(--muted-foreground))", fontSize: 11 } as const;

interface AiCreditsDailyChartProps {
  data: AiCreditsUsageDaily[];
  isLoading?: boolean;
}

function creditsFormatter(value: unknown): [string, string] {
  return [formatCredits(Number(value ?? 0)), "Credits"];
}

function tokensFormatter(value: unknown): [string, string] {
  return [formatTokens(Number(value ?? 0)), "Tokens"];
}

export function AiCreditsDailyChart({ data, isLoading }: AiCreditsDailyChartProps) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        date: format(parseISO(d.date), "MMM d"),
        credits: d.credits,
        tokens: d.totalTokens,
      })),
    [data],
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-4 text-sm font-semibold text-foreground">Daily Usage</p>
      {isLoading ? (
        <Skeleton className="h-[220px] w-full rounded-md" />
      ) : chartData.length === 0 ? (
        <ChartEmptyState compact message="No usage data for this period" />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="aiCreditsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={AXIS_TICK} />
            <YAxis
              tick={AXIS_TICK}
              tickFormatter={(v: number) => formatCredits(v)}
              width={52}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value: unknown, name: unknown) =>
                name === "credits" ? creditsFormatter(value) : tokensFormatter(value)
              }
            />
            <Area
              type="monotone"
              dataKey="credits"
              name="credits"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#aiCreditsGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
