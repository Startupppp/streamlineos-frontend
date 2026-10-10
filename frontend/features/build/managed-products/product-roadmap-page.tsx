"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRoadmapItems, useDeleteRoadmapItem } from "@/hooks/api/build/roadmap";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/ui/table-pagination";
import { BuildPaginatedContent } from "@/features/build/shared/build-paginated-content";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { PageState } from "@/components/shared/page-state";
import { RoadmapItemSheet } from "@/features/build/roadmap/roadmap-item-sheet";
import { BUILD_FILTER_ALL, useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import type { ScorableRoadmapItem } from "@/features/build/roadmap/roadmap-item-card";
import {
  ROADMAP_FILTER_DEFS,
  type RoadmapViewMode,
  isRoadmapHorizon,
  isRoadmapStatus,
} from "./product-roadmap-model";
import {
  MANAGED_PRODUCT_DETAIL_CONTENT_CLASS,
  ManagedProductDetailPrimarySection,
  ManagedProductDetailShell,
} from "./managed-product-detail-layout";
import { ProductRoadmapSkeleton } from "./managed-product-page-skeletons";
import { RoadmapBoardColumns } from "./roadmap/roadmap-board-columns";
import { RoadmapTimelineView } from "./roadmap/roadmap-timeline-view";
import { RoadmapFiltersBar } from "./roadmap/roadmap-filters-bar";
import { RoadmapPreviewSheet } from "./roadmap/roadmap-preview-sheet";
import type { RoadmapHorizon } from "@/types/projects";

interface ProductRoadmapPageProps {
  managedProductId: number;
}

export function ProductRoadmapPage({ managedProductId }: ProductRoadmapPageProps) {
  const canManage = useCan("build:roadmap:manage");
  const listFilters = useBuildListFilters({ filters: ROADMAP_FILTER_DEFS });
  const pager = useBuildCursorPager(listFilters.resetKey);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [viewMode, setViewMode] = useState<RoadmapViewMode>("board");
  const [previewOpen, setPreviewOpen] = useState(false);

  const statusValue = listFilters.value("status");
  const horizonValue = listFilters.value("horizon");
  const sortValue = listFilters.value("sort");
  const confidenceMinValue = listFilters.value("confidenceMin");
  const targetFromValue = listFilters.value("targetFrom");
  const targetToValue = listFilters.value("targetTo");
  const teamIdValue = listFilters.value("teamId");
  const goalIdValue = listFilters.value("goalId");
  const segmentValue = listFilters.value("segment");

  const filters = useMemo(
    () => ({
      managedProductId,
      ...(statusValue && statusValue !== BUILD_FILTER_ALL && isRoadmapStatus(statusValue) ? { status: statusValue } : {}),
      ...(horizonValue && horizonValue !== BUILD_FILTER_ALL && isRoadmapHorizon(horizonValue) ? { horizon: horizonValue } : {}),
      ...(listFilters.debouncedSearch.trim() ? { search: listFilters.debouncedSearch.trim() } : {}),
      ...(sortValue && sortValue !== BUILD_FILTER_ALL ? { sort: sortValue } : {}),
      ...(teamIdValue && teamIdValue !== BUILD_FILTER_ALL ? { teamId: Number(teamIdValue) } : {}),
      ...(goalIdValue && goalIdValue !== BUILD_FILTER_ALL ? { goalId: Number(goalIdValue) } : {}),
      ...(segmentValue && segmentValue !== BUILD_FILTER_ALL ? { segment: segmentValue } : {}),
      ...(confidenceMinValue && confidenceMinValue !== BUILD_FILTER_ALL ? { confidenceMin: Number(confidenceMinValue) } : {}),
      ...(targetFromValue && targetFromValue !== BUILD_FILTER_ALL ? { targetFrom: targetFromValue } : {}),
      ...(targetToValue && targetToValue !== BUILD_FILTER_ALL ? { targetTo: targetToValue } : {}),
      cursor: pager.cursor,
    }),
    [managedProductId, statusValue, horizonValue, sortValue, teamIdValue, goalIdValue, segmentValue, confidenceMinValue, targetFromValue, targetToValue, listFilters.debouncedSearch, pager.cursor],
  );

  const { data, isLoading, isError, error, refetch } = useRoadmapItems(filters);
  const deleteItem = useDeleteRoadmapItem();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ScorableRoadmapItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScorableRoadmapItem | null>(null);

  const grouped = useMemo(() => {
    const map: Record<RoadmapHorizon, ScorableRoadmapItem[]> = { now: [], next: [], later: [] };
    for (const item of data?.data ?? []) {
      map[item.horizon ?? "later"].push(item);
    }
    return map;
  }, [data]);

  const resolution = usePageState({
    permission: "build:roadmap:view",
    isLoading,
    isError,
    error,
    isEmpty: (data?.data ?? []).length === 0 && !pager.hasPrevious,
  });

  const handleEditItem = useCallback((item: ScorableRoadmapItem) => { setEditTarget(item); }, []);
  const handleDeleteItem = useCallback((item: ScorableRoadmapItem) => { setDeleteTarget(item); }, []);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteItem.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Roadmap item deleted"); setDeleteTarget(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteTarget, deleteItem]);

  const handleNext = useCallback(() => { pager.goNext(data?.pagination.nextCursor); }, [pager, data?.pagination.nextCursor]);
  const handlePrev = useCallback(() => { pager.goPrevious(); }, [pager]);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleOpenCreate = useCallback(() => { setCreateOpen(true); }, []);
  const handleCloseCreate = useCallback(() => { setCreateOpen(false); }, []);
  const handleCloseEdit = useCallback(() => { setEditTarget(null); }, []);
  const handleDeleteOpenChange = useCallback((open: boolean) => { if (!open) setDeleteTarget(null); }, []);
  const handleToggleView = useCallback(() => { setViewMode((v) => v === "board" ? "timeline" : "board"); }, []);
  const handleOpenPreview = useCallback(() => { setPreviewOpen(true); }, []);
  const handleClosePreview = useCallback(() => { setPreviewOpen(false); }, []);

  useBuildListKeyboard({
    itemCount: (data?.data ?? []).length,
    onOpen: () => undefined,
    onClearSelection: () => undefined,
    searchInputRef,
    enabled: !createOpen && !editTarget && !deleteTarget,
  });

  const hasNext = data?.pagination.hasMore ?? false;
  const allItems = data?.data ?? [];

  return (
    <PageWrapper
      title="Roadmap"
      subtitle="Product roadmap items"
      contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" type="button" onClick={handleToggleView}>
            {viewMode === "board" ? "Timeline" : "Board"}
          </Button>
          {canManage && resolution.kind !== "denied" ? (
            <Button size="sm" variant="outline" type="button" onClick={handleOpenPreview}>Preview</Button>
          ) : null}
          {canManage && resolution.kind !== "denied" ? (
            <Button size="sm" onClick={handleOpenCreate}>New Item</Button>
          ) : null}
        </div>
      }
      filters={
        <RoadmapFiltersBar
          managedProductId={managedProductId}
          listFilters={listFilters}
          searchInputRef={searchInputRef}
        />
      }
    >
      <ManagedProductDetailShell>
        <ManagedProductDetailPrimarySection className="gap-4">
          <PageState
            resolution={resolution}
            loading={<ProductRoadmapSkeleton />}
            empty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="projects"
                title="No roadmap items yet"
                description="Add items to plan what this product is working toward."
                action={canManage ? { label: "Add roadmap item", onClick: handleOpenCreate } : undefined}
              />
            }
            onRetry={handleRetry}
            className={CONTENT_FILL_PANEL}
          >
            <BuildPaginatedContent
              ariaLabel="Product roadmap items"
              contentClassName={viewMode === "board" ? "grid content-start items-start gap-3 md:grid-cols-3" : "flex flex-col gap-4"}
              footer={(
                <TablePagination
                  mode="cursor"
                  rowCount={allItems.length}
                  pageNumber={pager.pageNumber}
                  hasMore={hasNext}
                  hasPrevious={pager.hasPrevious}
                  onNext={handleNext}
                  onPrevious={handlePrev}
                />
              )}
            >
              {viewMode === "board" ? (
                <RoadmapBoardColumns grouped={grouped} onEdit={handleEditItem} onDelete={handleDeleteItem} />
              ) : (
                <RoadmapTimelineView items={allItems} onEdit={handleEditItem} onDelete={handleDeleteItem} />
              )}
            </BuildPaginatedContent>
          </PageState>
        </ManagedProductDetailPrimarySection>
      </ManagedProductDetailShell>

      {createOpen ? <RoadmapItemSheet managedProductId={managedProductId} onClose={handleCloseCreate} /> : null}
      {editTarget ? <RoadmapItemSheet item={editTarget} managedProductId={managedProductId} onClose={handleCloseEdit} /> : null}
      {previewOpen ? <RoadmapPreviewSheet items={allItems} onClose={handleClosePreview} /> : null}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteOpenChange}
        title="Delete roadmap item?"
        description={`"${deleteTarget?.title ?? ""}" will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}
