"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

const CHART_TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
} as const;

const AXIS_TICK = { fill: "hsl(var(--muted-foreground))", fontSize: 11 } as const;

interface ByDayChartProps {
  data: { date: string; hours: number }[];
  isLoading?: boolean;
}

export function ByDayChart({ data, isLoading }: ByDayChartProps) {
  const chartData = data.map((d) => ({
    date: format(parseISO(d.date), "MMM d"),
    hours: d.hours,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Hours by Day</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[220px] w-full rounded-md" />
        ) : chartData.length === 0 ? (
          <EmptyState compact illustrationPreset="chart" title="No data" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#hoursGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

interface ByProjectChartProps {
  data: { projectId: number | null; projectName: string; hours: number }[];
  isLoading?: boolean;
}

export function ByProjectChart({ data, isLoading }: ByProjectChartProps) {
  const sorted = [...data]
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);

  const chartHeight = Math.max(140, Math.min(sorted.length, 10) * 36);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Hours by Project</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[140px] w-full rounded-md" />
        ) : sorted.length === 0 ? (
          <EmptyState compact illustrationPreset="chart" title="No projects" />
        ) : (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={sorted} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                horizontal={false}
              />
              <XAxis type="number" tick={AXIS_TICK} />
              <YAxis
                type="category"
                dataKey="projectName"
                tick={AXIS_TICK}
                width={100}
              />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Bar dataKey="hours" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
