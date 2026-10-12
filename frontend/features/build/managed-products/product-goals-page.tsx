"use client";

import { LayoutList, LayoutGrid, Table2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ProductGoalsStats } from "./product-goals-stats";
import { TablePagination } from "@/components/ui/table-pagination";
import { BuildPaginatedContent } from "@/features/build/shared/build-paginated-content";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTargetIllustration } from "@/components/illustrations";
import { GoalFormSheet } from "@/features/build/goals/goal-form-sheet";
import { PageState } from "@/components/shared/page-state";
import { Button } from "@/components/ui/button";
import {
  PmSection,
  CONTENT_FILL_PANEL,
} from "@/components/pm-chrome";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { ShortcutHelpDialog } from "@/components/shared/shortcut-help-dialog";
import { BuildOfflineNotice } from "@/features/build/shared/build-offline-notice";
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
import { ProductGoalsViewBody } from "./product-goals-view-body";
import { buildProductReturnParam } from "@/features/build/shared/product-return-href";
import { useProductReturn } from "@/features/build/shared/use-product-return";
import type { GoalListItem } from "@/hooks/api/goals";

const VIEW_PARAM = "pg_view";
type GoalsViewMode = "list" | "tree" | "table";

const CheckInDialog = dynamic(
  () => import("@/features/build/goals/check-in-dialog").then((m) => ({ default: m.CheckInDialog })),
  { ssr: false },
);

interface ProductGoalsPageProps {
  managedProductId: number;
}

export function ProductGoalsPage({ managedProductId }: ProductGoalsPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { handleBack } = useProductReturn(`/build/managed-products/${managedProductId}`);
  const [, startTransition] = useTransition();
  const rawView = searchParams.get(VIEW_PARAM);
  const viewMode: GoalsViewMode =
    rawView === "table" ? "table" : rawView === "list" ? "list" : "tree";

  const handleViewModeChange = useCallback(
    (mode: GoalsViewMode) => {
      const next = new URLSearchParams(searchParams.toString());
      if (mode === "tree") next.delete(VIEW_PARAM);
      else next.set(VIEW_PARAM, mode);
      const query = next.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [searchParams, pathname, router],
  );

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

  const handleGoalRowClick = useCallback(
    (goal: GoalListItem) => {
      const ret = buildProductReturnParam(pathname, searchParams.toString());
      router.push(`/build/goals/${goal.id}?ret=${ret}`);
    },
    [router, pathname, searchParams],
  );

  const handleTreeMode = useCallback(() => handleViewModeChange("tree"), [handleViewModeChange]);
  const handleListMode = useCallback(() => handleViewModeChange("list"), [handleViewModeChange]);
  const handleTableMode = useCallback(() => handleViewModeChange("table"), [handleViewModeChange]);

  const viewToggle = (
    <div className="flex items-center gap-1" role="group" aria-label="View mode">
      <Button
        type="button"
        size="icon-sm"
        variant={viewMode === "tree" ? "secondary" : "ghost"}
        aria-label="Grouped view"
        onClick={handleTreeMode}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant={viewMode === "list" ? "secondary" : "ghost"}
        aria-label="List view"
        onClick={handleListMode}
      >
        <LayoutList className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant={viewMode === "table" ? "secondary" : "ghost"}
        aria-label="Table view"
        onClick={handleTableMode}
      >
        <Table2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <PageWrapper
      title="Goals & OKRs"
      subtitle="Objectives linked to this product"
      onBack={handleBack}
      contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
      filters={<GoalsListToolbar listFilters={listFilters} searchInputRef={searchInputRef} trailing={viewToggle} />}
      actions={<BuildHeaderActions actions={createActions} />}
    >
      <ManagedProductDetailShell>
        <PmSection index={0} className="shrink-0">
          <ProductGoalsStats stats={stats} isLoading={isLoading} />
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
                <ProductGoalsViewBody
                  viewMode={viewMode}
                  flatGoals={flatGoals}
                  totalGoals={totalGoals}
                  canManage={canManage}
                  onEdit={handleEditGoalCard}
                  onDelete={handleDeleteGoalCard}
                  onUnlink={handleUnlinkGoalCard}
                  onCheckIn={handleCheckInGoalCard}
                  onRowClick={handleGoalRowClick}
                />
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
