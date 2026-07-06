"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RequireModule } from "@/components/auth/require-module";
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
} from "@/hooks/api/goals";
import { GoalFormSheet } from "@/features/projects/goals/goal-form-sheet";
import {
  STATUS_CONFIG,
  LEVEL_LABEL,
  STATUS_OPTIONS,
  LEVEL_OPTIONS,
} from "@/features/projects/goals/constants";

const LEVEL_ORDER: GoalLevel[] = ["company", "team", "individual"];

function GoalCard({ goal }: { goal: GoalListItem }) {
  const cfg = STATUS_CONFIG[goal.status];
  const ownerName = goal.owner?.name ?? goal.owner?.email ?? null;

  return (
    <Link href={`/goals/${goal.id}`} className="block group">
      <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm transition-colors group-hover:border-primary/40">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm leading-snug line-clamp-2">
            {goal.title}
          </p>
          <Badge variant={cfg.variant} className="text-[10px] shrink-0">
            {cfg.label}
          </Badge>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="tabular-nums">{goal.progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${goal.progress}%` }}
            />
          </div>
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
      </div>
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
    <RequireModule module="PROJECTS">
    <PageWrapper
      title="Goals & OKRs"
      eyebrow="Projects"
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
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
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
      <StatCardGrid cols={4} className="mb-4">
        <StatCard
          label="Total Goals"
          value={stats?.total ?? 0}
          icon={Target}
          tone="blue"
          isLoading={isLoading}
        />
        <StatCard
          label="On Track"
          value={stats?.byStatus.on_track ?? 0}
          icon={TrendingUp}
          tone="emerald"
          isLoading={isLoading}
        />
        <StatCard
          label="At Risk"
          value={stats?.atRisk ?? 0}
          icon={AlertTriangle}
          tone="amber"
          isLoading={isLoading}
        />
        <StatCard
          label="Avg Progress"
          value={`${stats?.avgProgress ?? 0}%`}
          icon={TrendingUp}
          tone="violet"
          isLoading={isLoading}
        />
      </StatCardGrid>

      {isLoading ? (
        <LoadingState variant="cards" rows={6} />
      ) : isError ? (
        <ErrorState
          title="Failed to load goals"
          description="We couldn't load your goals. Please try again."
          onRetry={handleRetry}
        />
      ) : !hasGoals ? (
        <div className="flex flex-1 items-center justify-center min-h-[50vh]">
          <EmptyState
            illustration={<EmptyTargetIllustration />}
            title="No goals yet"
            description="Create your first objective with measurable key results to start tracking progress."
            action={{ label: "New Goal", onClick: handleOpenCreate }}
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
                  <h2 className="text-sm font-semibold text-foreground">
                    {LEVEL_LABEL[level]}
                  </h2>
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
    </RequireModule>
  );
}
