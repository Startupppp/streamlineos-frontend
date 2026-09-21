"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CHART_TOOLTIP_STYLE, AXIS_TICK } from "@/features/crm/shared/constants";
import { AnalyticsChartCard } from "./analytics-chart-card";

interface LeadVolumeChartProps {
  data: Array<{ week: string; leads: number }>;
}

export function LeadVolumeChart({ data }: LeadVolumeChartProps) {
  return (
    <AnalyticsChartCard title="Lead Volume Trend (12 weeks)" data={data} filename="lead-volume-trend">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="week" tick={AXIS_TICK} />
          <YAxis tick={AXIS_TICK} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </AnalyticsChartCard>
  );
}
