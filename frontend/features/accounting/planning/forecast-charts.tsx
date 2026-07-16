"use client";

import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CHART_TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
};
const AXIS_TICK = { fill: "hsl(var(--muted-foreground))", fontSize: 11 };
const COMPARE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

interface CompareChartProps {
  compareData: Array<Record<string, string | number>>;
  scenarios: Array<{ id: number; name: string }>;
}

export function CompareChart({ compareData, scenarios }: CompareChartProps) {
  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold">
          Closing Cash by Scenario
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={compareData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="weekStart" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} width={70} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            {scenarios.map((s, idx) => (
              <Line
                key={s.id}
                type="monotone"
                dataKey={String(s.id)}
                name={s.name}
                stroke={COMPARE_COLORS[idx % COMPARE_COLORS.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface ForecastAreaChartProps {
  forecastData: Array<{
    weekStart: string;
    rawWeekStart: string;
    closingCash: number;
    inflows: number;
    outflows: number;
    net: number;
    warning: boolean;
  }>;
  warningWeeks: Array<{ weekStart: string; rawWeekStart: string }>;
}

export function ForecastAreaChart({ forecastData, warningWeeks }: ForecastAreaChartProps) {
  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold">
          Closing Cash Position
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-4">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={forecastData}>
            <defs>
              <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="weekStart" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} width={70} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
            {warningWeeks.map((w) => (
              <ReferenceLine
                key={w.rawWeekStart}
                x={w.weekStart}
                stroke="#f59e0b"
                strokeDasharray="3 3"
              />
            ))}
            <Area
              type="monotone"
              dataKey="closingCash"
              name="Closing Cash"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#cashGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
