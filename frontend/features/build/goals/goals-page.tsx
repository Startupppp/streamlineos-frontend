"use client";

import { useGoalsPageData, GOALS_PAGE_SIZE } from "./use-goals-page";
import { GoalsGridSkeleton } from "./goals-skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { TablePagination } from "@/components/ui/table-pagination";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Target, TrendingUp, AlertTriangle } from "lucide-react";
import { RequireModule } from "@/components/auth/require-module";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTargetIllustration } from "@/components/illustrations";
import { GoalFormSheet } from "@/features/build/goals/goal-form-sheet";
import { LEVEL_LABEL } from "@/features/build/goals/constants";
import {
  PmPageShell,
  PmSection,
  PmStaggerList,
  CONTENT_FILL_PANEL,
  PM_FILL_SECTION,
} from "@/components/pm-chrome";
import { PageState } from "@/components/shared/page-state";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { GoalCard, GOAL_LEVEL_ORDER } from "@/features/build/goals/goals-list-shared";
import { GoalsListToolbar } from "@/features/build/goals/goals-list-toolbar";

export function GoalsPage() {
  const {
    canManage,
    createOpen,
    setCreateOpen,
    editGoalId,
    setEditGoalId,
    deleteGoalId,
    setDeleteGoalId,
    editGoalDetail,
    deleteGoalMutation,
    page,
    setPage,
    listFilters,
    totalGoals,
    stats,
    ownerOptions,
    grouped,
    isLoading,
    pageState,
    createActions,
    searchInputRef,
    handleOpenCreate,
    handleRetry,
    handleEditGoalCard,
    handleDeleteGoalCard,
    handleDeleteConfirm,
  } = useGoalsPageData();

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
        filters={<GoalsListToolbar listFilters={listFilters} searchInputRef={searchInputRef} ownerOptions={ownerOptions} />}
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
                  className={CONTENT_FILL_PANEL}
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
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="flex flex-col gap-6">
                    {GOAL_LEVEL_ORDER.map((level) => {
                      const levelGoals = grouped.get(level) ?? [];
                      if (levelGoals.length === 0) return null;
                      return (
                        <div key={level} className="flex flex-col gap-3">
                          <div className="flex items-center gap-2">
                            <h2 className="text-sm font-medium text-foreground">
                              {LEVEL_LABEL[level]}
                            </h2>
                            <Badge variant="secondary" className="text-micro">
                              {levelGoals.length}
                            </Badge>
                          </div>
                          <PmStaggerList className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {levelGoals.map((goal) => (
                              <GoalCard
                                key={goal.id}
                                goal={goal}
                                onEdit={canManage ? handleEditGoalCard : undefined}
                                onDelete={canManage ? handleDeleteGoalCard : undefined}
                              />
                            ))}
                          </PmStaggerList>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {totalGoals > 0 ? (
                  <TablePagination
                    page={page}
                    pageSize={GOALS_PAGE_SIZE}
                    total={totalGoals}
                    onPageChange={setPage}
                  />
                ) : null}
              </div>
            </PageState>
          </PmSection>
        </PmPageShell>

        <GoalFormSheet open={createOpen} onOpenChange={setCreateOpen} />
        {editGoalId !== null && editGoalDetail !== undefined ? (
          <GoalFormSheet
            open
            onOpenChange={(open) => { if (!open) setEditGoalId(null); }}
            goal={editGoalDetail}
          />
        ) : null}
        <ConfirmDialog
          open={deleteGoalId !== null}
          onOpenChange={(open) => { if (!open) setDeleteGoalId(null); }}
          title="Delete goal?"
          description="This action cannot be undone. All key results and updates will be removed."
          confirmLabel="Delete"
          destructive
          isPending={deleteGoalMutation.isPending}
          onConfirm={handleDeleteConfirm}
        />
      </PageWrapper>
    </RequireModule>
  );
}
