"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  useRoadmapItems,
  useDeleteRoadmapItem,
} from "@/hooks/api/build/roadmap";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/ui/table-pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BuildPaginatedContent } from "@/features/build/shared/build-paginated-content";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { PageState } from "@/components/shared/page-state";
import { RoadmapItemSheet } from "@/features/build/roadmap/roadmap-item-sheet";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import type { ScorableRoadmapItem } from "@/features/build/roadmap/roadmap-item-card";
import {
  ROADMAP_FILTER_DEFS,
  type RoadmapViewMode,
} from "./product-roadmap-model";
import { RoadmapInitiativePane } from "./roadmap/roadmap-initiative-pane";
import {
  MANAGED_PRODUCT_DETAIL_CONTENT_CLASS,
  ManagedProductDetailPrimarySection,
  ManagedProductDetailShell,
} from "./managed-product-detail-layout";
import {
  ProductRoadmapBoardSkeleton,
  ProductRoadmapSkeleton,
} from "./managed-product-page-skeletons";
import { RoadmapBoardColumns } from "./roadmap/roadmap-board-columns";
import { RoadmapTimelineView } from "./roadmap/roadmap-timeline-view";
import { RoadmapListView } from "./roadmap/roadmap-list-view";
import { RoadmapFiltersBar } from "./roadmap/roadmap-filters-bar";
import { RoadmapPreviewSheet } from "./roadmap/roadmap-preview-sheet";
import { RoadmapPublicationPanel } from "./roadmap/roadmap-publication-panel";
import { useProductReturn } from "@/features/build/shared/use-product-return";
import type { RoadmapHorizon } from "@/types/projects";

interface ProductRoadmapPageProps {
  managedProductId: number;
}

export function ProductRoadmapPage({
  managedProductId,
}: ProductRoadmapPageProps) {
  const canManage = useCan("build:roadmap:manage");
  const { handleBack } = useProductReturn(`/build/managed-products/${managedProductId}`);
  const listFilters = useBuildListFilters({ filters: ROADMAP_FILTER_DEFS });
  const pager = useBuildCursorPager(listFilters.resetKey);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const viewParam = searchParams.get("view");
  const viewMode: RoadmapViewMode =
    viewParam === "timeline"
      ? "timeline"
      : viewParam === "list"
        ? "list"
        : "board";

  const openItemId = searchParams.get("item")
    ? Number(searchParams.get("item"))
    : null;

  const handleViewItem = useCallback(
    (item: ScorableRoadmapItem) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("item", String(item.id));
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const {
    value: getFilter,
    debouncedSearch,
    resetKey: filtersKey,
  } = listFilters;

  const filters = useMemo(() => {
    const nv = (p: string) => {
      const x = getFilter(p);
      return x && x !== BUILD_FILTER_ALL ? x : undefined;
    };
    return {
      managedProductId,
      status: nv("status"),
      horizon: nv("horizon"),
      search: debouncedSearch.trim() || undefined,
      sort: nv("sort"),
      teamId: nv("teamId"),
      goalId: nv("goalId"),
      segment: nv("segment")?.trim(),
      confidenceMin: nv("confidenceMin")
        ? Number(nv("confidenceMin"))
        : undefined,
      targetFrom: nv("targetFrom"),
      targetTo: nv("targetTo"),
      customerVisible: nv("customerVisible")
        ? nv("customerVisible") === "true"
        : undefined,
      evidenceState: nv("evidenceState"),
      cursor: pager.cursor,
    };
  }, [managedProductId, getFilter, debouncedSearch, filtersKey, pager.cursor]);

  const { data, isLoading, isError, error, refetch } = useRoadmapItems(filters);
  const deleteItem = useDeleteRoadmapItem();

  const [createOpen, setCreateOpen] = useState(false);
  const [createHorizon, setCreateHorizon] = useState<RoadmapHorizon>("later");
  const [editTarget, setEditTarget] = useState<ScorableRoadmapItem | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<ScorableRoadmapItem | null>(
    null,
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publicationOpen, setPublicationOpen] = useState(false);

  const grouped = useMemo(() => {
    const map: Record<RoadmapHorizon, ScorableRoadmapItem[]> = {
      now: [],
      next: [],
      later: [],
    };
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
    isEmpty:
      viewMode !== "board" &&
      (data?.data ?? []).length === 0 &&
      !pager.hasPrevious,
  });

  const handleEditItem = useCallback((item: ScorableRoadmapItem) => {
    setEditTarget(item);
  }, []);
  const handleDeleteItem = useCallback((item: ScorableRoadmapItem) => {
    setDeleteTarget(item);
  }, []);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteItem.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Roadmap item deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteTarget, deleteItem]);

  const handleNext = useCallback(() => {
    pager.goNext(data?.pagination.nextCursor);
  }, [pager, data?.pagination.nextCursor]);
  const handlePrev = useCallback(() => {
    pager.goPrevious();
  }, [pager]);
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);
  const handleOpenCreate = useCallback(() => {
    setCreateHorizon("later");
    setCreateOpen(true);
  }, []);
  const handleCloseCreate = useCallback(() => {
    setCreateOpen(false);
  }, []);
  const handleCloseEdit = useCallback(() => {
    setEditTarget(null);
  }, []);
  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);
  const handleOpenPreview = useCallback(() => {
    setPreviewOpen(true);
  }, []);
  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
  }, []);
  const handleOpenPublication = useCallback(() => setPublicationOpen(true), []);
  const handleClosePublication = useCallback(
    () => setPublicationOpen(false),
    [],
  );

  const handleSetView = useCallback(
    (mode: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (mode === "board") next.delete("view");
      else next.set("view", mode);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const handleCreateInHorizon = useCallback((horizon: RoadmapHorizon) => {
    setCreateHorizon(horizon);
    setCreateOpen(true);
  }, []);

  useBuildListKeyboard({
    itemCount: (data?.data ?? []).length,
    onOpen: () => undefined,
    onClearSelection: () => undefined,
    searchInputRef,
    enabled: !createOpen && !editTarget && !deleteTarget,
  });

  const hasNext = data?.pagination.hasMore ?? false;
  const allItems = data?.data ?? [];

  const paginationFooter = (
    <TablePagination
      mode="cursor"
      rowCount={allItems.length}
      pageNumber={pager.pageNumber}
      hasMore={hasNext}
      hasPrevious={pager.hasPrevious}
      onNext={handleNext}
      onPrevious={handlePrev}
    />
  );

  return (
    <PageWrapper
      title="Roadmap"
      subtitle="Product roadmap items"
      onBack={handleBack}
      contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
      noInternalScroll={viewMode === "board" || viewMode === "list"}
      actions={
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
          <Tabs value={viewMode} onValueChange={handleSetView}>
            <TabsList>
              <TabsTrigger value="board">Board</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
            </TabsList>
          </Tabs>
          {canManage && resolution.kind !== "denied" ? (
            <>
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={handleOpenPreview}
              >
                Preview
              </Button>
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={handleOpenPublication}
              >
                Publish
              </Button>
              <Button size="sm" onClick={handleOpenCreate}>
                New Item
              </Button>
            </>
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
        <ManagedProductDetailPrimarySection>
          <PageState
            resolution={resolution}
            loading={
              viewMode === "board" ? (
                <ProductRoadmapBoardSkeleton />
              ) : (
                <ProductRoadmapSkeleton />
              )
            }
            empty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="projects"
                title="No roadmap items yet"
                description="Add items to plan what this product is working toward."
                action={
                  canManage
                    ? { label: "Add roadmap item", onClick: handleOpenCreate }
                    : undefined
                }
              />
            }
            onRetry={handleRetry}
            className={CONTENT_FILL_PANEL}
          >
            {viewMode === "board" ? (
              <>
                <RoadmapBoardColumns
                  grouped={grouped}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem}
                  onView={handleViewItem}
                  onCreateInHorizon={handleCreateInHorizon}
                />
                <div className="shrink-0">{paginationFooter}</div>
              </>
            ) : viewMode === "list" ? (
              <RoadmapListView
                items={allItems}
                onEdit={handleEditItem}
                onView={handleViewItem}
                pagination={{
                  pageSize: 50,
                  hasMore: hasNext,
                  hasPrevious: pager.hasPrevious,
                  pageNumber: pager.pageNumber,
                  onNext: handleNext,
                  onPrevious: handlePrev,
                }}
              />
            ) : (
              <BuildPaginatedContent
                ariaLabel="Product roadmap items"
                contentClassName="flex flex-col gap-4"
                footer={paginationFooter}
              >
                <RoadmapTimelineView
                  items={allItems}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem}
                  onView={handleViewItem}
                />
              </BuildPaginatedContent>
            )}
          </PageState>
        </ManagedProductDetailPrimarySection>
      </ManagedProductDetailShell>

      {createOpen ? (
        <RoadmapItemSheet
          managedProductId={managedProductId}
          defaultHorizon={createHorizon}
          onClose={handleCloseCreate}
        />
      ) : null}
      {editTarget ? (
        <RoadmapItemSheet
          item={editTarget}
          managedProductId={managedProductId}
          onClose={handleCloseEdit}
        />
      ) : null}
      {previewOpen ? (
        <RoadmapPreviewSheet
          managedProductId={managedProductId}
          onClose={handleClosePreview}
        />
      ) : null}
      {publicationOpen ? (
        <RoadmapPublicationPanel
          managedProductId={managedProductId}
          onClose={handleClosePublication}
        />
      ) : null}
      <RoadmapInitiativePane itemId={openItemId} />

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
