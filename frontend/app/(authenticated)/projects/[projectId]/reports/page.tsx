"use client";

import { use, useMemo, useState, useCallback } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  EmptyLeaderboardIllustration,
  EmptySearchIllustration,
} from "@/components/illustrations";
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
import { Gauge, TrendingUp, Layers, Camera, Route, ChevronRight, AlertTriangle, Timer } from "lucide-react";
import {
  useVelocityReport,
  useBurnupReport,
  useCfdReport,
  useCaptureSnapshot,
  useCriticalPath,
  useCycleTimeReport,
  useLeadTimeReport,
} from "@/hooks/api/projects/reports";
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
    <Card className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-sm">
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

  const handleRetry = useCallback(() => refetch(), [refetch]);

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
          onRetry={handleRetry}
          compact
        />
      ) : chartData.length === 0 ? (
        <EmptyState
          illustration={<EmptyLeaderboardIllustration />}
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

  const handleRetry = useCallback(() => refetch(), [refetch]);

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
          onRetry={handleRetry}
          compact
        />
      ) : sprints.length === 0 || chartData.length === 0 ? (
        <EmptyState
          illustration={<EmptyLeaderboardIllustration />}
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

  const handleRetry = useCallback(() => refetch(), [refetch]);

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
          onRetry={handleRetry}
          compact
        />
      ) : chartData.length === 0 ? (
        <EmptyState
          illustration={<EmptyLeaderboardIllustration />}
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

function CriticalPathSection({ projectId }: { projectId: number }) {
  const { data, isLoading, isError, refetch } = useCriticalPath(projectId);

  const handleRetry = useCallback(() => refetch(), [refetch]);

  const chain = data?.criticalPath ?? [];

  return (
    <ChartCard title="Critical Path" icon={Route}>
      {isLoading ? (
        <LoadingState variant="cards" rows={2} />
      ) : isError ? (
        <ErrorState
          title="Could not load critical path"
          description="Something went wrong while computing the project's critical path."
          onRetry={handleRetry}
          compact
        />
      ) : chain.length === 0 ? (
        <EmptyState
          illustration={<EmptySearchIllustration />}
          title="No dependency chain yet"
          description="Add 'blocks' relations between tickets to compute the critical path."
          compact
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold text-foreground">
              Total duration: {numberFormatter.format(data?.totalDuration ?? 0)}
            </span>
            <span className="text-muted-foreground">
              {numberFormatter.format(chain.length)}{" "}
              {chain.length === 1 ? "step" : "steps"}
            </span>
            <span className="text-muted-foreground">
              {numberFormatter.format(data?.edgeCount ?? 0)} dependencies across{" "}
              {numberFormatter.format(data?.nodeCount ?? 0)} tickets
            </span>
          </div>
          {data?.hasCycle ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                A dependency cycle was detected. Cycle edges were ignored, so this path is approximate. Review the
                &apos;blocks&apos; relations to remove the loop.
              </span>
            </div>
          ) : null}
          <ol className="flex flex-wrap items-stretch gap-2">
            {chain.map((node, index) => (
              <li key={node.ticketId} className="flex items-center gap-2">
                <div className="flex min-w-[8rem] flex-col rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <span className="truncate text-xs font-medium text-foreground" title={node.title}>
                    {node.title}
                  </span>
                  <span className="mt-1 text-[11px] text-muted-foreground">
                    Estimate {numberFormatter.format(node.estimate)} · Finish{" "}
                    {numberFormatter.format(node.earliestFinish)}
                  </span>
                </div>
                {index < chain.length - 1 ? (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      )}
    </ChartCard>
  );
}

function CycleTimeSection({ projectId }: { projectId: number }) {
  const { data = [], isLoading, isError, refetch } = useCycleTimeReport(projectId);

  const handleRetry = useCallback(() => refetch(), [refetch]);

  return (
    <ChartCard title="Cycle Time" icon={Timer}>
      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : isError ? (
        <ErrorState
          compact
          onRetry={handleRetry}
          description="Could not load cycle time."
        />
      ) : data.length === 0 ? (
        <EmptyState
          illustration={<EmptySearchIllustration />}
          title="No data yet"
          description="Complete some tickets to see cycle time."
          compact
        />
      ) : (
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(w: string) => w.slice(5)} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} unit=" d" />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v) => [`${v ?? 0} days`, "Avg Cycle Time"]}
              />
              <Bar dataKey="avgDays" fill="#6366f1" radius={[4, 4, 0, 0]} name="Avg Days" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

function LeadTimeSection({ projectId }: { projectId: number }) {
  const { data = [], isLoading, isError, refetch } = useLeadTimeReport(projectId);

  const handleRetry = useCallback(() => refetch(), [refetch]);

  return (
    <ChartCard title="Lead Time" icon={TrendingUp}>
      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : isError ? (
        <ErrorState
          compact
          onRetry={handleRetry}
          description="Could not load lead time."
        />
      ) : data.length === 0 ? (
        <EmptyState
          illustration={<EmptySearchIllustration />}
          title="No data yet"
          description="Complete some tickets to see lead time."
          compact
        />
      ) : (
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(w: string) => w.slice(5)} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} unit=" d" />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v) => [`${v ?? 0} days`]}
              />
              <Area dataKey="p90Days" fill="#c7d2fe" stroke="#818cf8" strokeWidth={1.5} name="P90" />
              <Area dataKey="p50Days" fill="#a5b4fc" stroke="#6366f1" strokeWidth={2} name="P50 (Median)" />
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
        <div className="grid gap-4 lg:grid-cols-2">
          <CycleTimeSection projectId={projectId} />
          <LeadTimeSection projectId={projectId} />
        </div>
        <CriticalPathSection projectId={projectId} />
      </div>
    </PageWrapper>
  );
}
