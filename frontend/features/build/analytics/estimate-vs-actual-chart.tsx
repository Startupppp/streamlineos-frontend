"use client";

import { memo } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import {
  CHART_COLORS,
  PROJECT_CHART_TOOLTIP_STYLE as TOOLTIP_STYLE,
  PROJECT_CHART_HEIGHT as CHART_H,
} from "./project-stats";

export interface EstimateChartRow {
  label: string;
  estimate: number;
  actual: number;
}

export const EstimateVsActualChart = memo(function EstimateVsActualChart({
  data,
}: {
  data: EstimateChartRow[];
}) {
  if (data.length === 0) {
    return <ChartEmptyState compact message="No estimation data yet" />;
  }
  return (
    <ResponsiveContainer width="100%" height={CHART_H}>
      <ScatterChart margin={{ top: 4, right: 4, left: -8, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="estimate"
          name="Estimate"
          tick={{ fontSize: 11 }}
          className="fill-muted-foreground"
          label={{
            value: "Estimate (pts)",
            position: "insideBottom",
            offset: -8,
            fontSize: 11,
          }}
        />
        <YAxis
          dataKey="actual"
          name="Actual"
          tick={{ fontSize: 11 }}
          className="fill-muted-foreground"
          label={{
            value: "Actual (pts)",
            angle: -90,
            position: "insideLeft",
            offset: 8,
            fontSize: 11,
          }}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Scatter data={data} name="Tickets">
          {data.map((_, index) => (
            <Cell
              key={index}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
});
