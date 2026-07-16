"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { CHART_SEMANTIC, PIE_COLORS, chartAxisTick, chartGridProps, chartTooltipStyle } from "./shared";

interface LeaveDeptChartProps {
  data: Array<{ dept: string; approved: number; pending: number; rejected: number }>;
}

export function LeaveDeptChart({ data }: LeaveDeptChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
        barCategoryGap="24%"
        barGap={4}
      >
        <CartesianGrid {...chartGridProps} />
        <XAxis dataKey="dept" tick={chartAxisTick} axisLine={false} tickLine={false} />
        <YAxis tick={chartAxisTick} allowDecimals={false} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={chartTooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        <Bar dataKey="approved" fill={CHART_SEMANTIC.success} radius={[4, 4, 0, 0]} maxBarSize={18} />
        <Bar dataKey="pending" fill={CHART_SEMANTIC.warning} radius={[4, 4, 0, 0]} maxBarSize={18} />
        <Bar dataKey="rejected" fill={CHART_SEMANTIC.danger} radius={[4, 4, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface LeaveMonthlyChartProps {
  data: Array<{ month: string; count: number }>;
}

export function LeaveMonthlyChart({ data }: LeaveMonthlyChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
        barCategoryGap="32%"
      >
        <CartesianGrid {...chartGridProps} />
        <XAxis dataKey="month" tick={chartAxisTick} axisLine={false} tickLine={false} />
        <YAxis tick={chartAxisTick} allowDecimals={false} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={chartTooltipStyle} />
        <Bar dataKey="count" fill={CHART_SEMANTIC.primary} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface LeaveTypePieChartProps {
  data: Array<{ name: string; value: number }>;
}

export function LeaveTypePieChart({ data }: LeaveTypePieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={72}
          innerRadius={44}
          paddingAngle={3}
          stroke="var(--card)"
          strokeWidth={2}
        >
          {data.map((_, idx) => (
            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={chartTooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
