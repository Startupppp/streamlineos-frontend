"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import type { TimeSeriesPoint } from "@/hooks/api/revenue-analytics";

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

interface MrrChartProps {
  timeSeries: TimeSeriesPoint[];
  isLoading: boolean;
  title: string;
}

export function MrrChart({ timeSeries, isLoading, title }: MrrChartProps) {
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
