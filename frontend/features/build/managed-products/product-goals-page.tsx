"use client";

import { Target, TrendingUp, AlertTriangle } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { TablePagination } from "@/components/ui/table-pagination";
import { BuildPaginatedContent } from "@/features/build/shared/build-paginated-content";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTargetIllustration } from "@/components/illustrations";
import { GoalFormSheet } from "@/features/build/goals/goal-form-sheet";
import { PageState } from "@/components/shared/page-state";
import { cn } from "@/lib/utils";
import {
  PmSection,
  PmStaggerList,
  CONTENT_FILL_PANEL,
  PM_PANEL,
} from "@/components/pm-chrome";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { ShortcutHelpDialog } from "@/components/shared/shortcut-help-dialog";
import { BuildOfflineNotice } from "@/features/build/shared/build-offline-notice";
import { GoalCard } from "@/features/build/goals/goals-list-shared";
import {
  GoalsListToolbar,
} from "@/features/build/goals/goals-list-toolbar";
import { useProductGoalsPage, PAGE_SIZE } from "./use-product-goals-page";
import {
  MANAGED_PRODUCT_DETAIL_CONTENT_CLASS,
  ManagedProductDetailPrimarySection,
  ManagedProductDetailShell,
} from "./managed-product-detail-layout";

interface ProductGoalsPageProps {
  managedProductId: number;
}

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
  const {
    listFilters,
    searchInputRef,
    createOpen,
    setCreateOpen,
    editGoalId,
    deleteGoalId,
    shortcutHelpOpen,
    setShortcutHelpOpen,
    editGoalDetail,
    deleteGoalMutation,
    isLoading,
    dataUpdatedAt,
    totalGoals,
    stats,
    flatGoals,
    resolution,
    page,
    canManage,
    handlePageChange,
    handleOpenCreate,
    handleRetry,
    handleEditGoalCard,
    handleDeleteGoalCard,
    handleDeleteConfirm,
    handleEditSheetOpenChange,
    handleDeleteDialogOpenChange,
    createActions,
  } = useProductGoalsPage({ managedProductId });

  return (
    <PageWrapper
      title="Goals & OKRs"
      subtitle="Product objectives and key results"
      contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
      filters={<GoalsListToolbar listFilters={listFilters} searchInputRef={searchInputRef} />}
      actions={<BuildHeaderActions actions={createActions} />}
    >
      <ManagedProductDetailShell>
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

        <BuildOfflineNotice dataUpdatedAt={dataUpdatedAt} />

        <ManagedProductDetailPrimarySection index={1}>
          <PageState
            resolution={resolution}
            loading={<GoalsSkeleton />}
            empty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
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
            className={CONTENT_FILL_PANEL}
          >
            <BuildPaginatedContent
              ariaLabel="Product goals"
              contentClassName=""
              footer={totalGoals > 0 ? (
                <TablePagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={totalGoals}
                  onPageChange={handlePageChange}
                />
              ) : null}
            >
                <PmStaggerList className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {flatGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onEdit={canManage ? handleEditGoalCard : undefined}
                      onDelete={canManage ? handleDeleteGoalCard : undefined}
                    />
                  ))}
                </PmStaggerList>
            </BuildPaginatedContent>
          </PageState>
        </ManagedProductDetailPrimarySection>
      </ManagedProductDetailShell>

      <ShortcutHelpDialog open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} />

      <GoalFormSheet open={createOpen} onOpenChange={setCreateOpen} managedProductId={managedProductId} />
      {editGoalId !== null && editGoalDetail !== undefined ? (
        <GoalFormSheet
          open
          onOpenChange={handleEditSheetOpenChange}
          goal={editGoalDetail}
        />
      ) : null}
      <ConfirmDialog
        open={deleteGoalId !== null}
        onOpenChange={handleDeleteDialogOpenChange}
        title="Delete goal?"
        description="This action cannot be undone. All key results and updates will be removed."
        confirmLabel="Delete"
        destructive
        isPending={deleteGoalMutation.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
