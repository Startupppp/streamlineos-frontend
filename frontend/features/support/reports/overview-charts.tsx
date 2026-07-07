"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { colorForKey } from "./lib/format";

const TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
} as const;

const AXIS_TICK = {
  fill: "hsl(var(--muted-foreground))",
  fontSize: 11,
} as const;

interface CountRow {
  count: number;
}

function toChartData<T extends CountRow>(
  rows: T[],
  labelKey: keyof T,
): { label: string; count: number; color: string }[] {
  return rows.map((row) => {
    const label = String(row[labelKey]);
    return { label, count: row.count, color: colorForKey(label) };
  });
}

function BarPanel({ title, data }: { title: string; data: { label: string; count: number; color: string }[] }) {
  return (
    <Card className="bg-card border border-border rounded-lg shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {data.length === 0 ? (
          <ChartEmptyState message="No data for this range." height={220} />
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.map((entry) => (
                    <Cell key={entry.label} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PriorityPanel({ data }: { data: { label: string; count: number; color: string }[] }) {
  return (
    <Card className="bg-card border border-border rounded-lg shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Tickets by Priority</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {data.length === 0 ? (
          <ChartEmptyState message="No data for this range." height={220} />
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {data.map((entry) => (
                    <Cell key={entry.label} fill={entry.color} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OverviewCharts({
  ticketsByChannel,
  ticketsByPriority,
  ticketsByCategory,
}: {
  ticketsByChannel: { channel: string; count: number }[];
  ticketsByPriority: { priority: string; count: number }[];
  ticketsByCategory: { category: string; count: number }[];
}) {
  const channelData = useMemo(() => toChartData(ticketsByChannel, "channel"), [ticketsByChannel]);
  const priorityData = useMemo(() => toChartData(ticketsByPriority, "priority"), [ticketsByPriority]);
  const categoryData = useMemo(() => toChartData(ticketsByCategory, "category"), [ticketsByCategory]);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <BarPanel title="Tickets by Channel" data={channelData} />
      <PriorityPanel data={priorityData} />
      <BarPanel title="Tickets by Category" data={categoryData} />
    </div>
  );
}
