"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TOOLTIP_STYLE, AXIS_TICK, GRID_STROKE, CHART_BLUE } from "./chart-card";

export interface LeadTimeDatum {
  week: string;
  avgDays: number;
  p50Days: number;
  p90Days: number;
  count: number;
}

export function LeadTimeChart({ data }: { data: LeadTimeDatum[] }) {
  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
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
            formatter={(v) => [`${v ?? 0} days`]}
          />
          <Area
            type="monotone"
            dataKey="p90Days"
            fill={CHART_BLUE[300]}
            fillOpacity={0.35}
            stroke={CHART_BLUE[600]}
            strokeWidth={1.5}
            name="P90"
          />
          <Area
            type="monotone"
            dataKey="p50Days"
            fill={CHART_BLUE[500]}
            fillOpacity={0.2}
            stroke={CHART_BLUE[500]}
            strokeWidth={2}
            dot={{ r: 3, fill: CHART_BLUE[500] }}
            name="P50 (Median)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
