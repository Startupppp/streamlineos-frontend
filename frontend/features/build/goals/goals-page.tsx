"use client";

import { useCallback, useMemo, useState } from "react";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { RequireModule } from "@/components/auth/require-module";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTargetIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import {
  Target,
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
import { GoalFormSheet } from "@/features/build/goals/goal-form-sheet";
import {
  GoalFiltersPopover,
  GoalLevelStatusFilters,
} from "@/features/build/goals/goal-filters-popover";
import {
  STATUS_CONFIG,
  LEVEL_LABEL,
  STATUS_OPTIONS,
  LEVEL_OPTIONS,
} from "@/features/build/goals/constants";
import {
  PmPageShell,
  PmSection,
  PmStaggerList,
  PM_FILL_PANEL,
  PM_PANEL,
  PM_TOOLBAR,
} from "@/features/build/shared/pm-chrome";
import {
  fadeUp,
  fadeUpReduced,
  listItem,
  listItemReduced,
  pmSnappy,
  pmStagger,
} from "@/lib/motion-presets";
import { TEXT_TWO_LINES } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";

function NewGoalButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} className="mr-1" /> New Goal
    </Button>
  );
}

const LEVEL_ORDER: GoalLevel[] = ["company", "team", "individual"];

function GoalCard({ goal }: { goal: GoalListItem }) {
  const cfg = STATUS_CONFIG[goal.status];
  const ownerName = goal.owner?.name ?? goal.owner?.email ?? null;
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={shouldReduceMotion ? listItemReduced : listItem}
      transition={pmSnappy}
    >
      <Link href={`/build/goal/${goal.id}`} className="group block">
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
            <Badge variant={cfg.variant} className="shrink-0 text-micro">
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
              <TruncatedText text={ownerName ?? "Unassigned"} />
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

export function GoalsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState<GoalStatus | "all">("all");
  const [levelFilter, setLevelFilter] = useState<GoalLevel | "all">("all");
  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } =
    useQueryParamOpen("create");
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

  const { data: goals, isLoading, isError, error, refetch } = useGoals(params);
  const { data: stats } = useGoalStats();

  const grouped = useMemo(() => {
    const map = new Map<GoalLevel, GoalListItem[]>();
    for (const level of LEVEL_ORDER) map.set(level, []);
    for (const goal of goals ?? []) map.get(goal.level)?.push(goal);
    return map;
  }, [goals]);

  const hasGoals = (goals?.length ?? 0) > 0;

  const handleOpenCreate = useCallback(() => { openCreate(); }, [openCreate]);

  const filtersActive =
    search.trim() !== "" || statusFilter !== "all" || levelFilter !== "all";

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("all");
    setLevelFilter("all");
  }, []);

  function handleSearchChange(value: string) { setSearch(value); }

  function handleLevelFilterChange(v: string) {
    if (v === "all") { setLevelFilter("all"); return; }
    const found = LEVEL_OPTIONS.find((o) => o.value === v);
    if (found) setLevelFilter(found.value);
  }

  function handleStatusFilterChange(v: string) {
    if (v === "all") { setStatusFilter("all"); return; }
    const found = STATUS_OPTIONS.find((o) => o.value === v);
    if (found) setStatusFilter(found.value);
  }

  function handleRetry() { void refetch(); }

  return (
    <RequireModule module="build">
      <PageWrapper
        title="Goals & OKRs"
        subtitle="Track company, team, and individual objectives and their key results"
        actions={
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <GoalFiltersPopover
                levelFilter={levelFilter}
                statusFilter={statusFilter}
                onLevelChange={handleLevelFilterChange}
                onStatusChange={handleStatusFilterChange}
              />
            </div>
            <NewGoalButton onClick={handleOpenCreate} />
          </div>
        }
        filters={
          <div className={PM_TOOLBAR}>
            <SearchInput
              placeholder="Search goals..."
              value={search}
              onValueChange={handleSearchChange}
            />
            <div className="hidden md:block">
              <GoalLevelStatusFilters
                levelFilter={levelFilter}
                statusFilter={statusFilter}
                onLevelChange={handleLevelFilterChange}
                onStatusChange={handleStatusFilterChange}
              />
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
                <StatCard label="Total Goals" value={stats?.total ?? 0} icon={Target} tone="default" isLoading={isLoading} />
              </motion.div>
              <motion.div
                variants={sectionVariants}
                transition={pmStagger(1)}
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
              >
                <StatCard label="On Track" value={stats?.byStatus.on_track ?? 0} icon={TrendingUp} tone="emerald" isLoading={isLoading} />
              </motion.div>
              <motion.div
                variants={sectionVariants}
                transition={pmStagger(2)}
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
              >
                <StatCard label="At Risk" value={stats?.atRisk ?? 0} icon={AlertTriangle} tone="amber" isLoading={isLoading} />
              </motion.div>
              <motion.div
                variants={sectionVariants}
                transition={pmStagger(3)}
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
              >
                <StatCard label="Avg Progress" value={`${stats?.avgProgress ?? 0}%`} icon={TrendingUp} tone="default" isLoading={isLoading} />
              </motion.div>
            </StatCardGrid>
          </PmSection>

          <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
            {isLoading ? (
              <GoalsGridSkeleton />
            ) : isError ? (
              <ErrorState
                className={PM_FILL_PANEL}
                title="Couldn't load goals"
                description={getErrorMessage(error)}
                onRetry={handleRetry}
              />
            ) : !hasGoals ? (
              <EmptyState
                className={PM_FILL_PANEL}
                illustration={<EmptyTargetIllustration />}
                title="No goals yet"
                description={
                  filtersActive
                    ? undefined
                    : "Create your first objective with measurable key results to start tracking progress."
                }
                filtersActive={filtersActive}
                onClearFilters={handleClearFilters}
                action={
                  filtersActive
                    ? undefined
                    : { label: "New Goal", onClick: handleOpenCreate }
                }
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
                        <Badge variant="secondary" className="text-micro">
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
