"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Plus, Target, TrendingUp, AlertTriangle } from "lucide-react";
import { useQueryParamOpen } from "@/hooks/common/use-query-param-open";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { TablePagination } from "@/components/ui/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTargetIllustration } from "@/components/illustrations";
import {
  useGoalsPage,
  useGoalStats,
  type GoalListItem,
  type GoalLevel,
} from "@/hooks/api/goals";
import { GoalFormSheet } from "@/features/build/goals/goal-form-sheet";
import {
  LEVEL_LABEL,
  STATUS_OPTIONS,
  LEVEL_OPTIONS,
} from "@/features/build/goals/constants";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { cn } from "@/lib/utils";
import {
  PmPageShell,
  PmSection,
  PmStaggerList,
  PM_FILL_PANEL,
  PM_PANEL,
} from "@/components/pm-chrome";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BUILD_FILTER_ALL, useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import {
  GoalCard,
  GoalsListToolbar,
  GOAL_FILTER_DEFINITIONS,
  GOAL_LEVEL_ORDER,
} from "@/features/build/goals/goals-list-shared";

interface ProductGoalsPageProps {
  managedProductId: number;
}

const PAGE_SIZE = 20;
const CREATE_ACTION = { id: "create", label: "New Goal", icon: Plus, primary: true as const };

export function GoalsSkeleton() {
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

export function ProductGoalsPage({ managedProductId }: ProductGoalsPageProps) {
  const listFilters = useBuildListFilters({ filters: GOAL_FILTER_DEFINITIONS });
  const { open: createOpen, onOpenChange: setCreateOpen, setOpen: openCreate } =
    useQueryParamOpen("create");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const levelValue = listFilters.value("level");
  const statusValue = listFilters.value("status");

  const ownerIdValue = listFilters.value("ownerId");

  const typedLevel = useMemo(
    () => LEVEL_OPTIONS.find((o) => o.value === levelValue)?.value,
    [levelValue],
  );

  const typedStatus = useMemo(
    () => STATUS_OPTIONS.find((o) => o.value === statusValue)?.value,
    [statusValue],
  );

  const [page, setPage] = useState(1);
  const [appliedResetKey, setAppliedResetKey] = useState(listFilters.resetKey);

  if (appliedResetKey !== listFilters.resetKey) {
    setAppliedResetKey(listFilters.resetKey);
    setPage(1);
  }

  const params = useMemo(
    () => ({
      managedProductId,
      page,
      limit: PAGE_SIZE,
      ...(typedStatus ? { status: typedStatus } : {}),
      ...(typedLevel ? { level: typedLevel } : {}),
      ...(ownerIdValue && ownerIdValue !== BUILD_FILTER_ALL ? { ownerId: ownerIdValue } : {}),
      ...(listFilters.debouncedSearch.trim()
        ? { search: listFilters.debouncedSearch.trim() }
        : {}),
    }),
    [managedProductId, page, typedStatus, typedLevel, ownerIdValue, listFilters.debouncedSearch],
  );

  const { data: goalsPage, isLoading, isError, error, refetch } = useGoalsPage(params);
  const goals = goalsPage?.items ?? [];
  const totalGoals = goalsPage?.total ?? 0;
  const { data: stats } = useGoalStats();

  const grouped = useMemo(() => {
    const map = new Map<GoalLevel, GoalListItem[]>();
    for (const level of GOAL_LEVEL_ORDER) map.set(level, []);
    for (const goal of goals) map.get(goal.level)?.push(goal);
    return map;
  }, [goals]);

  const resolution = usePageState({
    permission: "build:goals:view",
    isLoading,
    isError,
    error,
    isEmpty: goals.length === 0 && page === 1,
  });

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage);
  }, []);

  const handleOpenCreate = useCallback(() => { openCreate(); }, [openCreate]);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  useBuildListKeyboard({
    itemCount: goals.length,
    onOpen: () => undefined,
    onCreate: handleOpenCreate,
    onClearSelection: () => undefined,
    searchInputRef,
    enabled: !createOpen,
  });

  const createActions = useMemo(
    () =>
      resolution.kind !== "denied"
        ? [{ ...CREATE_ACTION, onSelect: handleOpenCreate }]
        : [],
    [resolution.kind, handleOpenCreate],
  );

  return (
    <PageWrapper
      title="Goals & OKRs"
      subtitle="Product objectives and key results"
      filters={<GoalsListToolbar listFilters={listFilters} searchInputRef={searchInputRef} />}
      actions={<BuildHeaderActions actions={createActions} />}
    >
      <PmPageShell>
        <PmSection index={0} className="shrink-0">
          <StatCardGrid cols={4}>
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

        <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
          <PageState
            resolution={resolution}
            loading={<GoalsSkeleton />}
            empty={
              <EmptyState
                className={PM_FILL_PANEL}
                illustration={<EmptyTargetIllustration />}
                title="No goals yet"
                description={
                  listFilters.isFiltered
                    ? undefined
                    : "Create goals linked to this product."
                }
                filtersActive={listFilters.isFiltered}
                onClearFilters={listFilters.clearAll}
                action={
                  listFilters.isFiltered
                    ? undefined
                    : { label: "New Goal", onClick: handleOpenCreate }
                }
              />
            }
            onRetry={handleRetry}
            className={PM_FILL_PANEL}
          >
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              <div className="space-y-8">
                {GOAL_LEVEL_ORDER.map((level) => {
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
              <TablePagination
                mode="offset"
                page={page}
                pageSize={PAGE_SIZE}
                total={totalGoals}
                onPageChange={handlePageChange}
              />
            </div>
          </PageState>
        </PmSection>
      </PmPageShell>

      <GoalFormSheet open={createOpen} onOpenChange={setCreateOpen} />
    </PageWrapper>
  );
}
