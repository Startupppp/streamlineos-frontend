"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const STAGE_COLORS = [
  "#06b6d4",
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
];

interface SlaBreachChartProps {
  reportData: Array<{ label: string; stages: Array<{ stage: string; breachPct: number }> }>;
  stages: string[];
}

export function SlaBreachChart({ reportData, stages }: SlaBreachChartProps) {
  const chartData = reportData.map((r) => {
    const row: Record<string, string | number> = { month: r.label };
    for (const s of r.stages) {
      row[s.stage] = s.breachPct;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={chartData}
        margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: unknown) => [`${v}%`, ""]} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {stages.map((stage, i) => (
          <Bar
            key={stage}
            dataKey={stage}
            name={stage}
            fill={STAGE_COLORS[i % STAGE_COLORS.length]}
            radius={[2, 2, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
