"use client";

import { useCallback, useMemo } from "react";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Target,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { RequireModule } from "@/components/auth/require-module";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTargetIllustration } from "@/components/illustrations";
import {
  useGoals,
  useGoalStats,
  type GoalListItem,
  type GoalLevel,
} from "@/hooks/api/goals";
import { useCan } from "@/hooks/api/access";
import { GoalFormSheet } from "@/features/build/goals/goal-form-sheet";
import {
  LEVEL_LABEL,
  STATUS_OPTIONS,
  LEVEL_OPTIONS,
} from "@/features/build/goals/constants";
import {
  PmPageShell,
  PmSection,
  PmStaggerList,
  PM_FILL_PANEL,
  PM_FILL_SECTION,
  PM_PANEL,
} from "@/components/pm-chrome";
import { cn } from "@/lib/utils";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import {
  GoalCard,
  GoalsListToolbar,
  GOAL_FILTER_DEFINITIONS,
  GOAL_LEVEL_ORDER,
} from "@/features/build/goals/goals-list-shared";

const CREATE_ACTION = { id: "create", label: "New Goal", icon: Plus, primary: true as const };

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
  const canManage = useCan("build:goals:manage");
  const listFilters = useBuildListFilters({ filters: GOAL_FILTER_DEFINITIONS });
  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } =
    useQueryParamOpen("create");

  const levelValue = listFilters.value("level");
  const statusValue = listFilters.value("status");

  const typedLevel = useMemo(
    () => LEVEL_OPTIONS.find((o) => o.value === levelValue)?.value,
    [levelValue],
  );

  const typedStatus = useMemo(
    () => STATUS_OPTIONS.find((o) => o.value === statusValue)?.value,
    [statusValue],
  );

  const params = useMemo(
    () => ({
      ...(typedStatus ? { status: typedStatus } : {}),
      ...(typedLevel ? { level: typedLevel } : {}),
      ...(listFilters.debouncedSearch.trim()
        ? { search: listFilters.debouncedSearch.trim() }
        : {}),
    }),
    [typedStatus, typedLevel, listFilters.debouncedSearch],
  );

  const { data: goals, isLoading, isError, error, refetch } = useGoals(params);
  const { data: stats } = useGoalStats();

  const grouped = useMemo(() => {
    const map = new Map<GoalLevel, GoalListItem[]>();
    for (const level of GOAL_LEVEL_ORDER) map.set(level, []);
    for (const goal of goals ?? []) map.get(goal.level)?.push(goal);
    return map;
  }, [goals]);

  const hasGoals = (goals?.length ?? 0) > 0;

  const handleOpenCreate = useCallback(() => { openCreate(); }, [openCreate]);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const pageState = usePageState({
    permission: "build:goals:view",
    isLoading,
    isError,
    error,
    isEmpty: !hasGoals,
  });

  const createActions = useMemo(
    () =>
      canManage
        ? [{ ...CREATE_ACTION, onSelect: handleOpenCreate }]
        : [],
    [canManage, handleOpenCreate],
  );

  if (
    pageState.kind !== "ready" &&
    pageState.kind !== "empty" &&
    pageState.kind !== "loading"
  ) {
    return (
      <PageWrapper
        title="Goals & OKRs"
        subtitle="Track company, team, and individual objectives and their key results"
      >
        <PmPageShell>
          <PageState
            resolution={pageState}
            loading={null}
            onRetry={handleRetry}
            className="flex-1"
          >
            {null}
          </PageState>
        </PmPageShell>
      </PageWrapper>
    );
  }

  return (
    <RequireModule module="build">
      <PageWrapper
        title="Goals & OKRs"
        subtitle="Track company, team, and individual objectives and their key results"
        filters={<GoalsListToolbar listFilters={listFilters} />}
        actions={<BuildHeaderActions actions={createActions} />}
      >
        <PmPageShell>
          <PmSection index={0} className="shrink-0">
            <StatCardGrid>
              <StatCard
                label="Total Goals"
                value={stats?.total ?? 0}
                icon={Target}
                tone="default"
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
                tone="default"
                isLoading={isLoading}
              />
            </StatCardGrid>
          </PmSection>

          <PmSection index={1} className={PM_FILL_SECTION}>
            <PageState
              resolution={pageState}
              onRetry={handleRetry}
              className="flex-1"
              loading={<GoalsGridSkeleton />}
              empty={
                <EmptyState
                  className={PM_FILL_PANEL}
                  illustration={<EmptyTargetIllustration />}
                  title="No goals yet"
                  description={
                    listFilters.isFiltered
                      ? undefined
                      : "Create your first objective with measurable key results to start tracking progress."
                  }
                  filtersActive={listFilters.isFiltered}
                  onClearFilters={listFilters.clearAll}
                  action={
                    listFilters.isFiltered || !canManage
                      ? undefined
                      : { label: "New Goal", onClick: handleOpenCreate }
                  }
                />
              }
            >
              <div className="flex flex-col gap-6 overflow-y-auto">
                {GOAL_LEVEL_ORDER.map((level) => {
                  const levelGoals = grouped.get(level) ?? [];
                  if (levelGoals.length === 0) return null;
                  return (
                    <div key={level} className="flex flex-col gap-3">
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
            </PageState>
          </PmSection>
        </PmPageShell>

        <GoalFormSheet open={createOpen} onOpenChange={setCreateOpen} />
      </PageWrapper>
    </RequireModule>
  );
}
