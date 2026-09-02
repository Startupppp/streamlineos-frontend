"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TOOLTIP_STYLE, AXIS_TICK, numberFormatter } from "./chart-card";

const CFD_GROUPS = [
  { key: "backlog", label: "Backlog", color: "#94A3B8" },
  { key: "unstarted", label: "Unstarted", color: "#3B82F6" },
  { key: "started", label: "Started", color: "#F59E0B" },
  { key: "completed", label: "Completed", color: "#10B981" },
  { key: "cancelled", label: "Cancelled", color: "#EF4444" },
] as const;

export interface CfdDatum {
  date: string;
  backlog: number;
  unstarted: number;
  started: number;
  completed: number;
  cancelled: number;
}

export function CfdChart({ data }: { data: CfdDatum[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />
          <XAxis
            dataKey="date"
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
          {CFD_GROUPS.map((g) => (
            <Area
              key={g.key}
              type="monotone"
              dataKey={g.key}
              name={g.label}
              stackId="cfd"
              stroke={g.color}
              fill={g.color}
              fillOpacity={0.65}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
