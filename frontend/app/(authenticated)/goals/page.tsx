"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTargetIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import {
  Target,
  Plus,
  Search,
  Users,
  TrendingUp,
  AlertTriangle,
  CalendarDays,
  ListChecks,
} from "lucide-react";
import { format } from "date-fns";
import {
  useGoals,
  useGoalStats,
  type GoalListItem,
  type GoalLevel,
  type GoalStatus,
} from "@/lib/api/hooks/goals";
import { GoalFormSheet } from "@/features/projects/goals/goal-form-sheet";
import { STATUS_CONFIG, LEVEL_LABEL, STATUS_OPTIONS, LEVEL_OPTIONS } from "@/features/projects/goals/constants";

const LEVEL_ORDER: GoalLevel[] = ["company", "team", "individual"];

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Target;
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function GoalCard({ goal }: { goal: GoalListItem }) {
  const cfg = STATUS_CONFIG[goal.status];
  const ownerName = goal.owner?.name ?? goal.owner?.email ?? null;

  return (
    <Link href={`/goals/${goal.id}`} className="block group">
      <Card className="transition-colors group-hover:border-primary/40">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-sm leading-snug line-clamp-2">{goal.title}</p>
            <Badge variant={cfg.variant} className="text-[10px] shrink-0">
              {cfg.label}
            </Badge>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span className="tabular-nums">{goal.progress}%</span>
            </div>
            <Progress value={goal.progress} className="h-1.5" />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 min-w-0">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{ownerName ?? "Unassigned"}</span>
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              <ListChecks className="h-3.5 w-3.5" />
              {goal.keyResultCount} KR{goal.keyResultCount === 1 ? "" : "s"}
            </span>
          </div>

          {goal.dueDate && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Due {format(new Date(goal.dueDate), "MMM d, yyyy")}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function GoalsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<GoalStatus | "all">("all");
  const [levelFilter, setLevelFilter] = useState<GoalLevel | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);

  const params = useMemo(
    () => ({
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      ...(levelFilter !== "all" ? { level: levelFilter } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
    }),
    [statusFilter, levelFilter, search],
  );

  const { data: goals, isLoading, isError, refetch } = useGoals(params);
  const { data: stats } = useGoalStats();

  const grouped = useMemo(() => {
    const map = new Map<GoalLevel, GoalListItem[]>();
    for (const level of LEVEL_ORDER) map.set(level, []);
    for (const goal of goals ?? []) {
      map.get(goal.level)?.push(goal);
    }
    return map;
  }, [goals]);

  const hasGoals = (goals?.length ?? 0) > 0;

  function handleOpenCreate() {
    setCreateOpen(true);
  }

  function handleSearchChange(e: ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
  }

  function handleLevelFilterChange(v: string) {
    setLevelFilter(v as GoalLevel | "all");
  }

  function handleStatusFilterChange(v: string) {
    setStatusFilter(v as GoalStatus | "all");
  }

  function handleRetry() {
    void refetch();
  }

  return (
    <PageWrapper
      title="Goals & OKRs"
      subtitle="Track company, team, and individual objectives and their key results"
      actions={
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-1" /> New Goal
        </Button>
      }
      filters={
        <div className="flex flex-wrap items-center gap-2 w-full">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search goals..."
              className="h-8 pl-8 text-sm"
              value={search}
              onChange={handleSearchChange}
            />
          </div>
          <Select value={levelFilter} onValueChange={handleLevelFilterChange}>
            <SelectTrigger className="h-8 w-[130px] text-sm">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {LEVEL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as GoalStatus | "all")}>
            <SelectTrigger className="h-8 w-[140px] text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <StatCard icon={Target} label="Total Goals" value={stats?.total ?? 0} tone="bg-blue-500/10 text-blue-600" />
        <StatCard
          icon={TrendingUp}
          label="On Track"
          value={stats?.byStatus.on_track ?? 0}
          tone="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="At Risk"
          value={stats?.atRisk ?? 0}
          tone="bg-amber-500/10 text-amber-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Progress"
          value={`${stats?.avgProgress ?? 0}%`}
          tone="bg-violet-500/10 text-violet-600"
        />
      </div>

      {isLoading ? (
        <LoadingState variant="cards" rows={6} />
      ) : isError ? (
        <ErrorState
          title="Failed to load goals"
          description="We couldn't load your goals. Please try again."
          onRetry={() => refetch()}
        />
      ) : !hasGoals ? (
        <div className="flex flex-1 items-center justify-center min-h-[50vh]">
          <EmptyState
            illustration={<EmptyTargetIllustration />}
            title="No goals yet"
            description="Create your first objective with measurable key results to start tracking progress."
            action={{ label: "New Goal", onClick: () => setCreateOpen(true) }}
          />
        </div>
      ) : (
        <div className="space-y-8">
          {LEVEL_ORDER.map((level) => {
            const levelGoals = grouped.get(level) ?? [];
            if (levelGoals.length === 0) return null;
            return (
              <div key={level} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground">{LEVEL_LABEL[level]}</h2>
                  <Badge variant="secondary" className="text-[10px]">
                    {levelGoals.length}
                  </Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {levelGoals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <GoalFormSheet open={createOpen} onOpenChange={setCreateOpen} />
    </PageWrapper>
  );
}
