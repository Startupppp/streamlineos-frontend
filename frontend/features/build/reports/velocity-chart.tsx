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
import { TOOLTIP_STYLE, AXIS_TICK, numberFormatter } from "./chart-card";

export interface VelocityDatum {
  name: string;
  Committed: number;
  Completed: number;
}

export function VelocityChart({ data }: { data: VelocityDatum[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => numberFormatter.format(Number(value))}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Committed" fill="#94A3B8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Completed" fill="#10B981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
