"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import {
  CHART_TOOLTIP_STYLE,
  AXIS_TICK,
} from "@/features/crm/shared/constants";
import type { SalesDashboardKPIsResult } from "@/hooks/api/crm/analytics";
import { AnalyticsChartCard } from "./analytics-chart-card";

type ChartValue = number | string | ReadonlyArray<number | string>;

function winRateFormatter(value: ChartValue | undefined): [string, string] {
  const display = Array.isArray(value) ? value[0] : value;
  return [`${display ?? 0}%`, "Win Rate"];
}

function yAxisTickFormatter(v: number | string): string {
  return `${v}%`;
}

interface WinRateTrendChartProps {
  kpis: SalesDashboardKPIsResult;
}

export function WinRateTrendChart({ kpis }: WinRateTrendChartProps) {
  const chartData = [
    { period: "Previous", winRate: Number(kpis.prevCloseRate.toFixed(1)) },
    { period: "Current", winRate: Number(kpis.closeRate.toFixed(1)) },
  ];

  return (
    <AnalyticsChartCard
      title="Win Rate Trend"
      data={chartData}
      filename="win-rate-trend"
    >
      <div className="h-[280px] flex flex-col">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 16, right: 16, bottom: 8, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="period" tick={AXIS_TICK} />
            <YAxis
              tick={AXIS_TICK}
              tickFormatter={yAxisTickFormatter}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={winRateFormatter}
            />
            <ReferenceLine
              y={50}
              stroke="var(--muted-foreground)"
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
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ fill: "#3b82f6", r: 5, strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-8 pb-2">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">
              {kpis.closeRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Current win rate</p>
          </div>
          {kpis.prevCloseRate > 0 && (
            <div className="text-center">
              <p className="text-2xl font-bold text-muted-foreground">
                {kpis.prevCloseRate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">Previous period</p>
            </div>
          )}
        </div>
      </div>
    </AnalyticsChartCard>
  );
}
