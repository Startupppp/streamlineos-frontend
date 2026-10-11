"use client";

import { AlertTriangle, ClipboardCheck, Target, TrendingUp } from "lucide-react";
import dynamic from "next/dynamic";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { TablePagination } from "@/components/ui/table-pagination";
import { BuildPaginatedContent } from "@/features/build/shared/build-paginated-content";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTargetIllustration } from "@/components/illustrations";
import { GoalFormSheet } from "@/features/build/goals/goal-form-sheet";
import { PageState } from "@/components/shared/page-state";
import {
  PmSection,
  PmStaggerList,
  CONTENT_FILL_PANEL,
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
import { ProductGoalsGridSkeleton } from "./managed-product-page-skeletons";
import { LinkExistingGoalDialog } from "./link-existing-goal-dialog";

const CheckInDialog = dynamic(
  () => import("@/features/build/goals/check-in-dialog").then((m) => ({ default: m.CheckInDialog })),
  { ssr: false },
);

interface ProductGoalsPageProps {
  managedProductId: number;
}

export function ProductGoalsPage({ managedProductId }: ProductGoalsPageProps) {
  const {
    listFilters,
    searchInputRef,
    createOpen,
    setCreateOpen,
    linkGoalOpen,
    setLinkGoalOpen,
    editGoalId,
    deleteGoalId,
    unlinkGoalId,
    checkInGoalId,
    shortcutHelpOpen,
    setShortcutHelpOpen,
    editGoalDetail,
    checkInGoalDetail,
    deleteGoalMutation,
    unlinkGoalMutation,
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
    handleUnlinkGoalCard,
    handleCheckInGoalCard,
    handleDeleteConfirm,
    handleUnlinkConfirm,
    handleEditSheetOpenChange,
    handleDeleteDialogOpenChange,
    handleUnlinkDialogOpenChange,
    handleCheckInClose,
    createActions,
  } = useProductGoalsPage({ managedProductId });

  const checkInKeyResults = checkInGoalDetail?.keyResults ?? [];

  return (
    <PageWrapper
      title="Goals & OKRs"
      subtitle="Objectives linked to this product"
      contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
      filters={<GoalsListToolbar listFilters={listFilters} searchInputRef={searchInputRef} />}
      actions={<BuildHeaderActions actions={createActions} />}
    >
      <ManagedProductDetailShell>
        <PmSection index={0} className="shrink-0">
          <StatCardGrid cols={5}>
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
            <StatCard
              label="Stale Check-ins"
              value={stats?.staleCheckIns ?? 0}
              icon={ClipboardCheck}
              tone={(stats?.staleCheckIns ?? 0) > 0 ? "amber" : "default"}
              isLoading={isLoading}
            />
          </StatCardGrid>
        </PmSection>

        <BuildOfflineNotice dataUpdatedAt={dataUpdatedAt} />

        <ManagedProductDetailPrimarySection index={1}>
          <PageState
            resolution={resolution}
            loading={<ProductGoalsGridSkeleton />}
            empty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustration={<EmptyTargetIllustration />}
                title="No goals yet"
                description={
                  listFilters.isFiltered
                    ? undefined
                    : "Create a goal or link an existing org goal to this product."
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
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium tabular-nums text-foreground">{totalGoals}</span>
                    {totalGoals === 1 ? " goal linked to this product" : " goals linked to this product"}
                  </p>
                  <PmStaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {flatGoals.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        onEdit={canManage ? handleEditGoalCard : undefined}
                        onDelete={canManage ? handleDeleteGoalCard : undefined}
                        onUnlink={canManage ? handleUnlinkGoalCard : undefined}
                        onCheckIn={handleCheckInGoalCard}
                      />
                    ))}
                  </PmStaggerList>
                </div>
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

      <ConfirmDialog
        open={unlinkGoalId !== null}
        onOpenChange={handleUnlinkDialogOpenChange}
        title="Unlink goal from product?"
        description="The goal will be removed from this product's Goals tab. The goal itself is not deleted and remains available in the org goals list."
        confirmLabel="Unlink"
        destructive
        isPending={unlinkGoalMutation.isPending}
        onConfirm={handleUnlinkConfirm}
      />

      {checkInGoalId !== null && checkInKeyResults.length > 0 ? (
        <CheckInDialog
          goalId={checkInGoalId}
          keyResults={checkInKeyResults}
          onClose={handleCheckInClose}
        />
      ) : null}

      <LinkExistingGoalDialog
        managedProductId={managedProductId}
        open={linkGoalOpen}
        onOpenChange={setLinkGoalOpen}
      />
    </PageWrapper>
  );
}
