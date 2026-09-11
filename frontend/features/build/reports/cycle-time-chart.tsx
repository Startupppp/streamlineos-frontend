"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TOOLTIP_STYLE, AXIS_TICK, GRID_STROKE, CHART_BLUE } from "./chart-card";

export interface CycleTimeDatum {
  week: string;
  avgDays: number;
  count: number;
}

export function CycleTimeChart({ data }: { data: CycleTimeDatum[] }) {
  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke={GRID_STROKE}
          />
          <XAxis
            dataKey="week"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={(w: string) => w.slice(5)}
          />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} unit=" d" />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v) => [`${v ?? 0} days`, "Avg Cycle Time"]}
          />
          <Bar
            dataKey="avgDays"
            fill={CHART_BLUE[500]}
            radius={[4, 4, 0, 0]}
            name="Avg Days"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
