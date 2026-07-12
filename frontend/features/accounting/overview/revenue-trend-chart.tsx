"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatINRCompact } from "@/lib/format-utils";

const TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
} as const;

const AXIS_TICK = { fill: "hsl(var(--muted-foreground))", fontSize: 11 } as const;

function toChartNumber(value: unknown): number {
  if (Array.isArray(value)) return Number(value[0] ?? 0);
  return Number(value ?? 0);
}

function revenueFormatter(value: unknown): [string, string] {
  return [formatINRCompact(toChartNumber(value)), "Revenue"];
}

function expensesFormatter(value: unknown): [string, string] {
  return [formatINRCompact(toChartNumber(value)), "Expenses"];
}

interface TrendPoint {
  month: string;
  revenue: string;
  expenses: string;
}

interface RevenueTrendChartProps {
  data: TrendPoint[];
}

function parseAmount(s: string): number {
  return Number(s) || 0;
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const chartData = data.map((d) => ({
    month: d.month.slice(5),
    revenue: parseAmount(d.revenue),
    expenses: parseAmount(d.expenses),
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-foreground mb-4">12-Month Revenue vs Expenses</p>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="finRevGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="finExpGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="month" tick={AXIS_TICK} />
          <YAxis tick={AXIS_TICK} tickFormatter={(v: number) => formatINRCompact(v)} width={64} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: unknown, name: unknown) =>
              name === "revenue" ? revenueFormatter(value) : expensesFormatter(value)
            }
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name="revenue"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#finRevGrad)"
          />
          <Area
            type="monotone"
            dataKey="expenses"
            name="expenses"
            stroke="#f59e0b"
            strokeWidth={2}
            fill="url(#finExpGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
