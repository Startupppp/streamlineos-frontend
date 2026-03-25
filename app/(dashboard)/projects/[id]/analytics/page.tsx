"use client";

import { use, useMemo } from "react";
import { trpc } from "@/trpc/client";
import { ProjectSubNav } from "@/components/projects/project-sub-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { BarChart3 } from "lucide-react";
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

const STATE_COLORS: Record<string, string> = {
  backlog: "#94a3b8",
  todo: "#60a5fa",
  in_progress: "#facc15",
  in_review: "#a78bfa",
  done: "#4ade80",
  cancelled: "#f87171",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
  none: "#94a3b8",
};

const CHART_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
];

export default function AnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const projectId = parseInt(id);

  const { data: analytics, isLoading } = trpc.project.analyticsGetProjectAnalytics.useQuery({
    projectId,
  });

  const stateData = useMemo(() => {
    if (!analytics?.stateDistribution) return [];
    return analytics.stateDistribution.map((row: { status: string | null; count: number }) => {
      const state = row.status ?? "unknown";
      return {
        state: state.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        count: row.count,
        fill: STATE_COLORS[state.toLowerCase()] ?? "#94a3b8",
      };
    });
  }, [analytics?.stateDistribution]);

  const priorityData = useMemo(() => {
    if (!analytics?.priorityBreakdown) return [];
    return analytics.priorityBreakdown.map((row: { priority: string | null; count: number }) => {
      const priority = row.priority ?? "none";
      return {
        name: priority.charAt(0).toUpperCase() + priority.slice(1),
        value: row.count,
        fill: PRIORITY_COLORS[priority.toLowerCase()] ?? "#94a3b8",
      };
    });
  }, [analytics?.priorityBreakdown]);

  const volumeData = useMemo(() => {
    if (!analytics?.volumeOverTime) return [];
    return analytics.volumeOverTime.map(
      (entry: { week: string | null; count: number }) => ({
        date: entry.week ?? "",
        created: entry.count,
      })
    );
  }, [analytics?.volumeOverTime]);

  const assigneeData = useMemo(() => {
    if (!analytics?.assigneeCompletion) return [];
    return analytics.assigneeCompletion.map(
      (entry: { assigneeId: string | null; total: number; completed: number }) => ({
        name: entry.assigneeId != null ? `User ${entry.assigneeId}` : "Unassigned",
        completed: entry.completed,
        total: entry.total,
        rate: entry.total > 0 ? Math.round((entry.completed / entry.total) * 100) : 0,
      })
    );
  }, [analytics?.assigneeCompletion]);

  const velocityData = useMemo(() => {
    if (!analytics?.cycleVelocity) return [];
    return analytics.cycleVelocity.map(
      (entry: { cycleId: number; cycleName: string | null; completedPoints: number }) => ({
        cycle: entry.cycleName ?? `Cycle ${entry.cycleId}`,
        points: entry.completedPoints,
      })
    );
  }, [analytics?.cycleVelocity]);

  const estimateData = useMemo(() => {
    if (!analytics?.estimateVsActual) return [];
    return analytics.estimateVsActual.map(
      (entry: { ticketId: number; title: string; estimated: string | null; actual: number }) => ({
        label: entry.title || `#${entry.ticketId}`,
        estimate: entry.estimated ? parseFloat(entry.estimated) : 0,
        actual: entry.actual,
      })
    );
  }, [analytics?.estimateVsActual]);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-shrink-0 px-6 sm:px-8 md:px-12 pt-6 sm:pt-8 md:pt-12 pb-4 bg-background border-b">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_: unknown, i: number) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-shrink-0 px-6 sm:px-8 md:px-12 pt-6 sm:pt-8 md:pt-12 pb-4 bg-background border-b">
          <ProjectSubNav projectId={projectId} />
          <div className="mt-4">
            <h1 className="text-2xl font-bold">Analytics</h1>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-16">
            <EmptyActivityIllustration className="mx-auto mb-4 w-36 h-36" />
            <h3 className="text-lg font-semibold mb-1">No data yet</h3>
            <p className="text-sm text-muted-foreground">
              Analytics will appear once your project has work items.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 px-6 sm:px-8 md:px-12 pt-6 sm:pt-8 md:pt-12 pb-4 bg-background border-b">
        <ProjectSubNav projectId={projectId} />
        <div className="mt-4">
          <h1 className="text-2xl font-bold">Analytics</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">State Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {stateData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stateData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="state"
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {stateData.map((entry: { fill: string }, index: number) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                  No state data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Priority Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {priorityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {priorityData.map((entry: { fill: string }, index: number) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                  No priority data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Volume Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {volumeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={volumeData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
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
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                  No volume data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Completion Rate by Assignee</CardTitle>
            </CardHeader>
            <CardContent>
              {assigneeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={assigneeData} layout="vertical">
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
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={((value: string | number) => [`${value}%`, "Completion Rate"]) as never}
                    />
                    <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                      {assigneeData.map((_: unknown, index: number) => (
                        <Cell
                          key={index}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                  No assignee data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cycle Velocity</CardTitle>
            </CardHeader>
            <CardContent>
              {velocityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={velocityData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="cycle"
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      className="fill-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar
                      dataKey="points"
                      fill="#8b5cf6"
                      radius={[4, 4, 0, 0]}
                      name="Completed Points"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                  No velocity data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estimate vs Actual</CardTitle>
            </CardHeader>
            <CardContent>
              {estimateData.length > 0 ? (
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
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={((value: string | number, name: string) => [value, name]) as never}
                    />
                    <Scatter
                      data={estimateData}
                      fill="#f43f5e"
                      shape="circle"
                    >
                      {estimateData.map((_: unknown, index: number) => (
                        <Cell
                          key={index}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                  No estimate data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
