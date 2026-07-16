"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { PIE_COLORS, chartTooltipStyle } from "./shared";

interface RecruitmentPieChartProps {
  sources: Array<{ source: string; count: number }>;
}

export function RecruitmentPieChart({ sources }: RecruitmentPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={sources.map((s) => ({ name: s.source, value: s.count }))}
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
          {sources.map((_, idx) => (
            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={chartTooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
