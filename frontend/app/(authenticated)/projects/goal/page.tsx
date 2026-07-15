"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTargetIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import {
  Target,
  Search,
  Users,
  TrendingUp,
  AlertTriangle,
  CalendarDays,
  ListChecks,
} from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
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
import {
  PmPageShell,
  PmSection,
  PmStaggerList,
  PM_FILL_PANEL,
  PM_PANEL,
  PM_TOOLBAR,
} from "@/features/projects/shared/pm-chrome";
import {
  fadeUp,
  fadeUpReduced,
  listItem,
  listItemReduced,
  pmSnappy,
  pmStagger,
} from "@/features/projects/shared/pm-motion";
import { TEXT_ONE_LINE, TEXT_TWO_LINES } from "@/features/projects/shared/text-overflow";
import { cn } from "@/lib/utils";

function NewGoalButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} className="mr-1" /> New Goal
    </Button>
  );
}

const LEVEL_ORDER: GoalLevel[] = ["company", "team", "individual"];

const STAT_GLASS =
  "border-border/60 bg-card/50 shadow-sm backdrop-blur-md transition-shadow duration-150 hover:shadow-md supports-[backdrop-filter]:bg-card/40";

function GoalCard({ goal }: { goal: GoalListItem }) {
  const cfg = STATUS_CONFIG[goal.status];
  const ownerName = goal.owner?.name ?? goal.owner?.email ?? null;
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={shouldReduceMotion ? listItemReduced : listItem}
      transition={pmSnappy}
    >
      <Link href={`/projects/goal/${goal.id}`} className="group block">
        <div
          className={cn(
            PM_PANEL,
            "space-y-3 p-4 transition-[border-color,box-shadow] duration-200 group-hover:border-primary/40 group-hover:shadow-md",
          )}
        >
          <div className="flex min-w-0 items-start justify-between gap-2">
            <p
              className={cn(TEXT_TWO_LINES, "text-sm font-medium leading-snug")}
              title={goal.title}
            >
              {goal.title}
            </p>
            <Badge variant={cfg.variant} className="shrink-0 text-[10px]">
              {cfg.label}
            </Badge>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span className="tabular-nums">{goal.progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                style={{ width: `${goal.progress}%` }}
              />
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-between text-xs text-muted-foreground">
            <span className="flex min-w-0 items-center gap-1.5">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span className={TEXT_ONE_LINE}>{ownerName ?? "Unassigned"}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              <ListChecks className="h-3.5 w-3.5" />
              {goal.keyResultCount} KR{goal.keyResultCount === 1 ? "" : "s"}
            </span>
          </div>

          {goal.dueDate ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Due {format(new Date(goal.dueDate), "MMM d, yyyy")}</span>
            </div>
          ) : null}
        </div>
      </Link>
    </motion.div>
  );
}

function GoalsGridSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn(PM_PANEL, "space-y-3 p-4")}>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState<GoalStatus | "all">("all");
  const [levelFilter, setLevelFilter] = useState<GoalLevel | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const sectionVariants = shouldReduceMotion ? fadeUpReduced : fadeUp;

  const params = useMemo(
    () => ({
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      ...(levelFilter !== "all" ? { level: levelFilter } : {}),
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
    }),
    [statusFilter, levelFilter, debouncedSearch],
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
    if (v === "all") {
      setLevelFilter("all");
      return;
    }
    const found = LEVEL_OPTIONS.find((o) => o.value === v);
    if (found) setLevelFilter(found.value);
  }

  function handleStatusFilterChange(v: string) {
    if (v === "all") {
      setStatusFilter("all");
      return;
    }
    const found = STATUS_OPTIONS.find((o) => o.value === v);
    if (found) setStatusFilter(found.value);
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
        actions={<NewGoalButton onClick={handleOpenCreate} />}
        filters={
          <div className={PM_TOOLBAR}>
            <div className="relative min-w-[180px] max-w-sm flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search goals..."
                className="h-8 pl-8 text-sm"
                value={search}
                onChange={handleSearchChange}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
          </div>
        }
      >
        <PmPageShell>
          <PmSection index={0} className="shrink-0">
            <StatCardGrid cols={4}>
              <motion.div
                variants={sectionVariants}
                transition={pmStagger(0)}
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
              >
                <StatCard
                  label="Total Goals"
                  value={stats?.total ?? 0}
                  icon={Target}
                  tone="blue"
                  isLoading={isLoading}
                  className={STAT_GLASS}
                />
              </motion.div>
              <motion.div
                variants={sectionVariants}
                transition={pmStagger(1)}
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
              >
                <StatCard
                  label="On Track"
                  value={stats?.byStatus.on_track ?? 0}
                  icon={TrendingUp}
                  tone="emerald"
                  isLoading={isLoading}
                  className={STAT_GLASS}
                />
              </motion.div>
              <motion.div
                variants={sectionVariants}
                transition={pmStagger(2)}
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
              >
                <StatCard
                  label="At Risk"
                  value={stats?.atRisk ?? 0}
                  icon={AlertTriangle}
                  tone="amber"
                  isLoading={isLoading}
                  className={STAT_GLASS}
                />
              </motion.div>
              <motion.div
                variants={sectionVariants}
                transition={pmStagger(3)}
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
              >
                <StatCard
                  label="Avg Progress"
                  value={`${stats?.avgProgress ?? 0}%`}
                  icon={TrendingUp}
                  tone="default"
                  isLoading={isLoading}
                  className={STAT_GLASS}
                />
              </motion.div>
            </StatCardGrid>
          </PmSection>

          <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
            {isLoading ? (
              <GoalsGridSkeleton />
            ) : isError ? (
              <ErrorState
                className={PM_FILL_PANEL}
                title="Failed to load goals"
                description="We couldn't load your goals. Please try again."
                onRetry={handleRetry}
              />
            ) : !hasGoals ? (
              <EmptyState
                className={PM_FILL_PANEL}
                illustration={<EmptyTargetIllustration />}
                title="No goals yet"
                description="Create your first objective with measurable key results to start tracking progress."
                action={{ label: "New Goal", onClick: handleOpenCreate }}
              />
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
                      <PmStaggerList className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {levelGoals.map((goal) => (
                          <GoalCard key={goal.id} goal={goal} />
                        ))}
                      </PmStaggerList>
                    </div>
                  );
                })}
              </div>
            )}
          </PmSection>
        </PmPageShell>

        <GoalFormSheet open={createOpen} onOpenChange={setCreateOpen} />
      </PageWrapper>
    </RequireModule>
  );
}
