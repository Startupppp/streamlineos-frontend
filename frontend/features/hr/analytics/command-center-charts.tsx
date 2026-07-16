"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { chartTooltipStyle, chartGridProps, chartAxisTick, CHART_SEMANTIC } from "./shared";

interface JoinsExitsChartProps {
  data: Array<{ month: string; joins: number; exits: number }>;
}

export function JoinsExitsChart({ data }: JoinsExitsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="joinGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_SEMANTIC.primary} stopOpacity={0.15} />
            <stop offset="95%" stopColor={CHART_SEMANTIC.primary} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="exitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_SEMANTIC.danger} stopOpacity={0.15} />
            <stop offset="95%" stopColor={CHART_SEMANTIC.danger} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...chartGridProps} />
        <XAxis dataKey="month" tick={chartAxisTick} />
        <YAxis tick={chartAxisTick} width={28} />
        <Tooltip contentStyle={chartTooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area
          type="monotone"
          dataKey="joins"
          stroke={CHART_SEMANTIC.primary}
          fill="url(#joinGrad)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="exits"
          stroke={CHART_SEMANTIC.danger}
          fill="url(#exitGrad)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface LeaveStackChartProps {
  data: Array<Record<string, string | number>>;
  leaveTypeKeys: string[];
  leaveTypeColors: string[];
}

export function LeaveStackChart({ data, leaveTypeKeys, leaveTypeColors }: LeaveStackChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <CartesianGrid {...chartGridProps} />
        <XAxis dataKey="month" tick={chartAxisTick} />
        <YAxis tick={chartAxisTick} width={28} />
        <Tooltip contentStyle={chartTooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {leaveTypeKeys.map((key, idx) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="a"
            fill={leaveTypeColors[idx % leaveTypeColors.length]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

interface MoodTrendChartProps {
  data: Array<{ month: string; avgMood: number }>;
}

export function MoodTrendChart({ data }: MoodTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid {...chartGridProps} />
        <XAxis dataKey="month" tick={chartAxisTick} />
        <YAxis domain={[0, 5]} tick={chartAxisTick} width={28} />
        <Tooltip contentStyle={chartTooltipStyle} />
        <Line
          type="monotone"
          dataKey="avgMood"
          stroke={CHART_SEMANTIC.accent}
          strokeWidth={2}
          dot={false}
          name="Avg Mood"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface PerformanceDistChartProps {
  data: Array<{ rating: number | string; count: number }>;
}

export function PerformanceDistChart({ data }: PerformanceDistChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <CartesianGrid {...chartGridProps} />
        <XAxis
          dataKey="rating"
          tick={chartAxisTick}
          label={{ value: "Rating", position: "insideBottom", offset: -2, style: { fontSize: 10 } }}
        />
        <YAxis tick={chartAxisTick} width={28} />
        <Tooltip contentStyle={chartTooltipStyle} />
        <Bar dataKey="count" fill={CHART_SEMANTIC.primary} radius={[3, 3, 0, 0]} name="Employees" />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface PayrollCostChartProps {
  data: Array<{ month: string; grossTotal: number }>;
  formatCurrency: (cents: number) => string;
}

export function PayrollCostChart({ data, formatCurrency }: PayrollCostChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid {...chartGridProps} />
        <XAxis dataKey="month" tick={chartAxisTick} />
        <YAxis tick={chartAxisTick} width={40} tickFormatter={(v: number) => formatCurrency(v)} />
        <Tooltip
          contentStyle={chartTooltipStyle}
          formatter={(value) => [formatCurrency(Number(value)), "Gross Total"]}
        />
        <Line
          type="monotone"
          dataKey="grossTotal"
          stroke="#1d4ed8"
          strokeWidth={2}
          dot={false}
          name="Gross Total"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
