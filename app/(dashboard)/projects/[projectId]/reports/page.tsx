"use client";

import { use, useMemo, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Gauge, TrendingUp, Layers, Camera } from "lucide-react";
import {
  useVelocityReport,
  useBurnupReport,
  useCfdReport,
  useCaptureSnapshot,
} from "@/lib/api/hooks/projects/reports";
import { toast } from "sonner";
import { format } from "date-fns";

const CFD_GROUPS = [
  { key: "backlog", label: "Backlog", color: "#94A3B8" },
  { key: "unstarted", label: "Unstarted", color: "#3B82F6" },
  { key: "started", label: "Started", color: "#F59E0B" },
  { key: "completed", label: "Completed", color: "#10B981" },
  { key: "cancelled", label: "Cancelled", color: "#EF4444" },
] as const;

const TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
} as const;

const AXIS_TICK = { fill: "hsl(var(--muted-foreground))", fontSize: 11 } as const;

const numberFormatter = new Intl.NumberFormat("en-IN");

function ChartCard({
  title,
  icon: Icon,
  actions,
  children,
}: {
  title: string;
  icon: typeof Gauge;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
        {actions}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function VelocitySection({ projectId }: { projectId: number }) {
  const { data, isLoading, isError, refetch } = useVelocityReport(projectId);

  const chartData = useMemo(
    () =>
      (data ?? []).map((s) => ({
        name: s.name,
        Committed: s.committedPoints,
        Completed: s.completedPoints,
      })),
    [data],
  );

  return (
    <ChartCard title="Velocity" icon={Gauge}>
      {isLoading ? (
        <LoadingState variant="cards" rows={2} />
      ) : isError ? (
        <ErrorState
          title="Could not load velocity"
          description="Something went wrong while computing sprint velocity."
          onRetry={() => refetch()}
          compact
        />
      ) : chartData.length === 0 ? (
        <EmptyState
          icon={Gauge}
          title="No sprint data yet"
          description="Velocity appears once you have active or completed sprints with estimated work."
          compact
        />
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value) => numberFormatter.format(Number(value))}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Committed" fill="#94A3B8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Completed" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

function BurnupSection({ projectId }: { projectId: number }) {
  const velocity = useVelocityReport(projectId);
  const [sprintId, setSprintId] = useState<number | undefined>(undefined);

  const sprints = velocity.data ?? [];
  const activeSprintId = sprints.length > 0 ? sprints[sprints.length - 1].sprintId : undefined;
  const selectedSprintId = sprintId ?? activeSprintId;

  const { data, isLoading, isError, refetch } = useBurnupReport(projectId, selectedSprintId);

  const chartData = useMemo(
    () =>
      (data ?? []).map((p) => ({
        date: format(new Date(p.date), "MMM d"),
        Scope: p.scope,
        Completed: p.completed,
      })),
    [data],
  );

  function handleSprintChange(value: string) {
    setSprintId(Number(value));
  }

  const sprintSelect =
    sprints.length > 0 ? (
      <Select value={selectedSprintId ? String(selectedSprintId) : undefined} onValueChange={handleSprintChange}>
        <SelectTrigger className="h-8 w-44 text-xs">
          <SelectValue placeholder="Select sprint" />
        </SelectTrigger>
        <SelectContent>
          {sprints.map((s) => (
            <SelectItem key={s.sprintId} value={String(s.sprintId)}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : null;

  return (
    <ChartCard title="Burnup" icon={TrendingUp} actions={sprintSelect}>
      {velocity.isLoading || isLoading ? (
        <LoadingState variant="cards" rows={2} />
      ) : velocity.isError || isError ? (
        <ErrorState
          title="Could not load burnup"
          description="Something went wrong while computing the burnup chart."
          onRetry={() => refetch()}
          compact
        />
      ) : sprints.length === 0 || chartData.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No sprint to chart"
          description="Burnup tracks completed work against scope across a sprint's date range."
          compact
        />
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="burnupCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value) => numberFormatter.format(Number(value))}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="Scope"
                stroke="#94A3B8"
                strokeDasharray="4 4"
                fill="transparent"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Completed"
                stroke="#10B981"
                fill="url(#burnupCompleted)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

function CfdSection({ projectId }: { projectId: number }) {
  const [days, setDays] = useState(30);
  const { data, isLoading, isError, refetch } = useCfdReport(projectId, days);
  const capture = useCaptureSnapshot(projectId);

  function handleDaysChange(value: string) {
    setDays(Number(value));
  }

  function handleCapture() {
    capture.mutate(undefined, {
      onSuccess: (result) => toast.success(`Snapshot captured (${result.captured} states)`),
      onError: () => toast.error("Failed to capture snapshot"),
    });
  }

  const chartData = useMemo(
    () =>
      (data?.series ?? []).map((p) => ({
        date: format(new Date(p.date), "MMM d"),
        backlog: p.backlog,
        unstarted: p.unstarted,
        started: p.started,
        completed: p.completed,
        cancelled: p.cancelled,
      })),
    [data],
  );

  const actions = (
    <div className="flex items-center gap-2">
      <Select value={String(days)} onValueChange={handleDaysChange}>
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="14">14 days</SelectItem>
          <SelectItem value="30">30 days</SelectItem>
          <SelectItem value="60">60 days</SelectItem>
          <SelectItem value="90">90 days</SelectItem>
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" className="h-8" onClick={handleCapture} disabled={capture.isPending}>
        <Camera className="h-3.5 w-3.5 mr-1.5" />
        {capture.isPending ? "Capturing…" : "Capture today"}
      </Button>
    </div>
  );

  return (
    <ChartCard title="Cumulative Flow" icon={Layers} actions={actions}>
      {isLoading ? (
        <LoadingState variant="cards" rows={2} />
      ) : isError ? (
        <ErrorState
          title="Could not load cumulative flow"
          description="Something went wrong while loading flow history."
          onRetry={() => refetch()}
          compact
        />
      ) : chartData.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No flow history yet"
          description="The cumulative flow diagram accrues one data point per day. Capture today's snapshot to start building history."
          action={{ label: capture.isPending ? "Capturing…" : "Capture today's snapshot", onClick: handleCapture }}
          compact
        />
      ) : (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value) => numberFormatter.format(Number(value))}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {CFD_GROUPS.map((g) => (
                <Area
                  key={g.key}
                  type="monotone"
                  dataKey={g.key}
                  name={g.label}
                  stackId="cfd"
                  stroke={g.color}
                  fill={g.color}
                  fillOpacity={0.65}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

export default function ProjectReportsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: projectIdStr } = use(params);
  const projectId = Number(projectIdStr);

  return (
    <PageWrapper title="Agile Reports" subtitle="Velocity, burnup, and cumulative flow for this project">
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <VelocitySection projectId={projectId} />
          <BurnupSection projectId={projectId} />
        </div>
        <CfdSection projectId={projectId} />
      </div>
    </PageWrapper>
  );
}
