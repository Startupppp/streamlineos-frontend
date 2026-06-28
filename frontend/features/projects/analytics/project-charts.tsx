"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  PieChart,
  AreaChart,
  Bar,
  Pie,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  Legend,
  ScatterChart,
  Scatter,
} from "recharts";
import type { Sprint } from "@/types/projects";
import { STATE_COLORS, PRIORITY_COLORS, CHART_COLORS } from "./project-stats";

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
};

interface StateChartProps {
  data: { state: string; count: number; fill: string }[];
}

export function StateDistributionChart({ data }: StateChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
        No state data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="state"
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
        />
        <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface PriorityChartProps {
  data: { name: string; value: number; fill: string }[];
}

export function PriorityBreakdownChart({ data }: PriorityChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
        No priority data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface VolumeChartProps {
  data: { date: string; created: number }[];
}

export function VolumeOverTimeChart({ data }: VolumeChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
        No volume data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
        />
        <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Area
          type="monotone"
          dataKey="created"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.15}
          strokeWidth={2}
          name="Created"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface AssigneeChartProps {
  data: {
    name: string;
    completed: number;
    total: number;
    rate: number;
  }[];
}

export function AssigneeCompletionChart({ data }: AssigneeChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
        No assignee data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          type="number"
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
          domain={[0, 100]}
          unit="%"
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
          width={100}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value) => (value != null ? `${value}%` : "")}
        />
        <Bar dataKey="rate" name="Completion Rate" radius={[0, 4, 4, 0]}>
          {data.map((_, index) => (
            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface VelocityChartProps {
  data: { cycle: string; points: number }[];
}

export function CycleVelocityChart({ data }: VelocityChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
        No velocity data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="cycle"
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
        />
        <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar
          dataKey="points"
          fill="#8b5cf6"
          radius={[4, 4, 0, 0]}
          name="Completed Points"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface BurndownChartProps {
  data: { date: string; remaining: number; ideal: number }[];
  sprints: Sprint[] | undefined;
  sprintId: number;
  onSprintChange: (id: number) => void;
}

export function SprintBurndownChart({
  data,
  sprints,
  sprintId,
  onSprintChange,
}: BurndownChartProps) {
  const handleSprintChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    onSprintChange(Number(e.target.value));

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base">Sprint Burndown</CardTitle>
          {sprints && sprints.length > 0 && (
            <select
              className="text-xs rounded-md border border-border bg-background px-2 py-1 text-foreground"
              value={sprintId}
              onChange={handleSprintChange}
              aria-label="Select sprint for burndown chart"
            >
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.status === "ACTIVE" ? "(Active)" : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              <Area
                type="monotone"
                dataKey="ideal"
                stroke="#94a3b8"
                fill="#94a3b8"
                fillOpacity={0.08}
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Ideal"
              />
              <Area
                type="monotone"
                dataKey="remaining"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.15}
                strokeWidth={2}
                name="Remaining"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
            {sprints && sprints.length === 0
              ? "No sprints found for this project"
              : "No burndown data available for this sprint"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface EstimateChartProps {
  data: { label: string; estimate: number; actual: number }[];
}

export function EstimateVsActualChart({ data }: EstimateChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
        No estimate data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="estimate"
          name="Estimate"
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
          label={{
            value: "Estimate",
            position: "bottom",
            className: "fill-muted-foreground",
            fontSize: 12,
          }}
        />
        <YAxis
          dataKey="actual"
          name="Actual"
          tick={{ fontSize: 12 }}
          className="fill-muted-foreground"
          label={{
            value: "Actual",
            angle: -90,
            position: "insideLeft",
            className: "fill-muted-foreground",
            fontSize: 12,
          }}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Scatter data={data} fill="#f43f5e" shape="circle">
          {data.map((_, index) => (
            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

export { STATE_COLORS, PRIORITY_COLORS, CHART_COLORS };
