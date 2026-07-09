"use client";

import { memo, useCallback } from "react";
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
import { ChartEmptyState } from "@/components/charts/chart-empty-state";
import { STATE_COLORS, PRIORITY_COLORS, CHART_COLORS } from "./project-stats";

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

const CHART_H = 220;

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  colSpan?: "full";
  actions?: React.ReactNode;
}

function ChartCard({ title, children, colSpan, actions }: ChartCardProps) {
  return (
    <Card
      className={`bg-card border border-border rounded-xl shadow-sm${colSpan === "full" ? " md:col-span-2" : ""}`}
    >
      <CardHeader className="pb-1 pt-4 px-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {actions}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">{children}</CardContent>
    </Card>
  );
}

export interface StateChartRow {
  state: string;
  count: number;
  fill: string;
}

export const StateDistributionChart = memo(function StateDistributionChart({
  data,
}: {
  data: StateChartRow[];
}) {
  if (data.length === 0) {
    return <ChartEmptyState compact message="No state data yet" />;
  }
  return (
    <ResponsiveContainer width="100%" height={CHART_H}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-border"
          vertical={false}
        />
        <XAxis
          dataKey="state"
          tick={{ fontSize: 11 }}
          className="fill-muted-foreground"
        />
        <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Tickets">
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
});

export interface PriorityChartRow {
  name: string;
  value: number;
  fill: string;
}

export const PriorityBreakdownChart = memo(function PriorityBreakdownChart({
  data,
}: {
  data: PriorityChartRow[];
}) {
  if (data.length === 0) {
    return <ChartEmptyState compact message="No priority data yet" />;
  }
  return (
    <ResponsiveContainer width="100%" height={CHART_H}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
});

export interface VolumeChartRow {
  date: string;
  created: number;
}

export const VolumeOverTimeChart = memo(function VolumeOverTimeChart({
  data,
}: {
  data: VolumeChartRow[];
}) {
  if (data.length === 0) {
    return <ChartEmptyState compact message="No volume data yet" />;
  }
  return (
    <ResponsiveContainer width="100%" height={CHART_H}>
      <AreaChart
        data={data}
        margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-border"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          className="fill-muted-foreground"
        />
        <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Area
          type="monotone"
          dataKey="created"
          stroke="#1d4ed8"
          fill="#1d4ed8"
          fillOpacity={0.12}
          strokeWidth={2}
          name="Created"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});

export interface AssigneeChartRow {
  name: string;
  completed: number;
  total: number;
  rate: number;
}

export const AssigneeCompletionChart = memo(function AssigneeCompletionChart({
  data,
}: {
  data: AssigneeChartRow[];
}) {
  if (data.length === 0) {
    return <ChartEmptyState compact message="No assignee data yet" />;
  }
  return (
    <ResponsiveContainer width="100%" height={CHART_H}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-border"
          horizontal={false}
        />
        <XAxis
          type="number"
          tick={{ fontSize: 11 }}
          className="fill-muted-foreground"
          domain={[0, 100]}
          unit="%"
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11 }}
          className="fill-muted-foreground"
          width={88}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="rate" name="Completion %" radius={[0, 4, 4, 0]}>
          {data.map((_, index) => (
            <Cell
              key={index}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
});

export interface VelocityChartRow {
  cycle: string;
  points: number;
}

export const CycleVelocityChart = memo(function CycleVelocityChart({
  data,
}: {
  data: VelocityChartRow[];
}) {
  if (data.length === 0) {
    return <ChartEmptyState compact message="No velocity data yet" />;
  }
  return (
    <ResponsiveContainer width="100%" height={CHART_H}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-border"
          vertical={false}
        />
        <XAxis
          dataKey="cycle"
          tick={{ fontSize: 11 }}
          className="fill-muted-foreground"
        />
        <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar
          dataKey="points"
          fill="#8b5cf6"
          radius={[4, 4, 0, 0]}
          name="Completed pts"
        />
      </BarChart>
    </ResponsiveContainer>
  );
});

export interface BurndownChartRow {
  date: string;
  remaining: number;
  ideal: number;
}

interface SprintBurndownProps {
  data: BurndownChartRow[];
  sprints: Sprint[] | undefined;
  sprintId: number;
  onSprintChange: (id: number) => void;
}

export const SprintBurndownChart = memo(function SprintBurndownChart({
  data,
  sprints,
  sprintId,
  onSprintChange,
}: SprintBurndownProps) {
  const handleSprintChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) =>
      onSprintChange(Number(e.target.value)),
    [onSprintChange],
  );

  const sprintSelector =
    sprints && sprints.length > 0 ? (
      <select
        className="text-xs rounded-md border border-border bg-background px-2 py-1 text-foreground h-7"
        value={sprintId}
        onChange={handleSprintChange}
        aria-label="Select sprint"
      >
        {sprints.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
            {s.status === "ACTIVE" ? " (Active)" : ""}
          </option>
        ))}
      </select>
    ) : null;

  return (
    <ChartCard title="Sprint Burndown" colSpan="full" actions={sprintSelector}>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={CHART_H}>
          <AreaChart
            data={data}
            margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
            />
            <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <Area
              type="monotone"
              dataKey="ideal"
              stroke="#94a3b8"
              fill="#94a3b8"
              fillOpacity={0.06}
              strokeWidth={1.5}
              strokeDasharray="5 5"
              name="Ideal"
            />
            <Area
              type="monotone"
              dataKey="remaining"
              stroke="#1d4ed8"
              fill="#1d4ed8"
              fillOpacity={0.12}
              strokeWidth={2}
              name="Remaining"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <ChartEmptyState
          compact
          message={
            sprints && sprints.length === 0
              ? "No sprints found for this project"
              : "No burndown data for this sprint"
          }
        />
      )}
    </ChartCard>
  );
});

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

export { STATE_COLORS, PRIORITY_COLORS, CHART_COLORS };

export { ChartCard };
