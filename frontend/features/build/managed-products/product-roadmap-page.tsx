"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRoadmapItems, useDeleteRoadmapItem, usePositionRoadmapItem } from "@/hooks/api/build/roadmap";
import type { RoadmapHorizon } from "@/types/projects";
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
import { ROADMAP_HORIZON_COLUMNS } from "@/features/build/roadmap/roadmap-constants";
import { RoadmapItemCard, type ScorableRoadmapItem } from "@/features/build/roadmap/roadmap-item-card";
import { RoadmapItemSheet } from "@/features/build/roadmap/roadmap-item-sheet";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BUILD_FILTER_ALL, useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import {
  PmPanel,
  PmStaggerList,
  CONTENT_FILL_PANEL,
} from "@/components/pm-chrome";
import {
  ROADMAP_STATUS_OPTS,
  ROADMAP_HORIZON_OPTS,
  ROADMAP_SORT_OPTS,
  ROADMAP_FILTER_DEFS,
} from "./product-roadmap-model";
import {
  MANAGED_PRODUCT_DETAIL_CONTENT_CLASS,
  ManagedProductDetailPrimarySection,
  ManagedProductDetailShell,
} from "./managed-product-detail-layout";
import { ProductRoadmapSkeleton } from "./managed-product-page-skeletons";

interface ProductRoadmapPageProps {
  managedProductId: number;
}

export function ProductRoadmapPage({ managedProductId }: ProductRoadmapPageProps) {
  const canManage = useCan("build:roadmap:manage");
  const listFilters = useBuildListFilters({ filters: ROADMAP_FILTER_DEFS });
  const pager = useBuildCursorPager(listFilters.resetKey);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const statusValue = listFilters.value("status");
  const horizonValue = listFilters.value("horizon");
  const sortValue = listFilters.value("sort");

  const filters = useMemo(
    () => ({
      managedProductId,
      ...(statusValue && statusValue !== BUILD_FILTER_ALL ? { status: statusValue as "planned" | "in_progress" | "completed" | "cancelled" } : {}),
      ...(horizonValue && horizonValue !== BUILD_FILTER_ALL ? { horizon: horizonValue } : {}),
      ...(listFilters.debouncedSearch.trim() ? { search: listFilters.debouncedSearch.trim() } : {}),
      ...(sortValue && sortValue !== BUILD_FILTER_ALL ? { sort: sortValue } : {}),
      cursor: pager.cursor,
    }),
    [managedProductId, statusValue, horizonValue, sortValue, listFilters.debouncedSearch, pager.cursor],
  );

  const { data, isLoading, isError, error, refetch } = useRoadmapItems(filters);
  const deleteItem = useDeleteRoadmapItem();
  const positionItem = usePositionRoadmapItem();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ScorableRoadmapItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScorableRoadmapItem | null>(null);

  const grouped = useMemo(() => {
    const map: Record<RoadmapHorizon, ScorableRoadmapItem[]> = { now: [], next: [], later: [] };
    for (const item of data?.data ?? []) {
      const h = item.horizon ?? "later";
      map[h].push(item);
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

  const handleMove = useCallback((item: ScorableRoadmapItem, horizon: RoadmapHorizon) => {
    positionItem.mutate(
      { roadmapItemId: item.id, version: item.version, horizon },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  }, [positionItem]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteItem.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Roadmap item deleted"); setDeleteTarget(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [deleteTarget, deleteItem]);

  const handleNext = useCallback(() => {
    pager.goNext(data?.pagination.nextCursor);
  }, [pager, data?.pagination.nextCursor]);

  const handlePrev = useCallback(() => {
    pager.goPrevious();
  }, [pager]);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleOpenCreate = useCallback(() => { setCreateOpen(true); }, []);
  const handleCloseCreate = useCallback(() => { setCreateOpen(false); }, []);

  useBuildListKeyboard({
    itemCount: (data?.data ?? []).length,
    onOpen: () => undefined,
    onClearSelection: () => undefined,
    searchInputRef,
    enabled: !createOpen && !editTarget && !deleteTarget,
  });

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );
  const handleHorizonChange = useCallback(
    (value: string) => listFilters.setValue("horizon", value),
    [listFilters],
  );
  const handleSortChange = useCallback(
    (value: string) => listFilters.setValue("sort", value),
    [listFilters],
  );
  const handleCloseEdit = useCallback(() => { setEditTarget(null); }, []);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const hasNext = data?.pagination.hasMore ?? false;

  return (
    <PageWrapper
      title="Roadmap"
      subtitle="Product roadmap items"
      contentClassName={MANAGED_PRODUCT_DETAIL_CONTENT_CLASS}
      actions={
        canManage && resolution.kind !== "denied" ? (
          <Button size="sm" onClick={handleOpenCreate}>New Item</Button>
        ) : undefined
      }
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search roadmap…",
            label: "Search roadmap",
            inputRef: searchInputRef,
          }}
          filters={[
            {
              id: "horizon",
              label: "Horizon",
              active: listFilters.isActive("horizon"),
              control: (
                <BuildFilterSelect
                  label="Horizon"
                  value={horizonValue}
                  onValueChange={handleHorizonChange}
                  options={ROADMAP_HORIZON_OPTS}
                />
              ),
            },
            {
              id: "status",
              label: "Status",
              active: listFilters.isActive("status"),
              control: (
                <BuildFilterSelect
                  label="Status"
                  value={statusValue}
                  onValueChange={handleStatusChange}
                  options={ROADMAP_STATUS_OPTS}
                />
              ),
            },
            {
              id: "sort",
              label: "Sort",
              active: listFilters.isActive("sort"),
              control: (
                <BuildFilterSelect
                  label="Sort"
                  value={sortValue}
                  onValueChange={handleSortChange}
                  options={ROADMAP_SORT_OPTS}
                />
              ),
            },
          ]}
          onClearAll={listFilters.clearAll}
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
              contentClassName="grid content-start items-start gap-3 md:grid-cols-3"
              footer={(
                <TablePagination
                  mode="cursor"
                  rowCount={(data?.data ?? []).length}
                  pageNumber={pager.pageNumber}
                  hasMore={hasNext}
                  hasPrevious={pager.hasPrevious}
                  onNext={handleNext}
                  onPrevious={handlePrev}
                />
              )}
            >
                {ROADMAP_HORIZON_COLUMNS.map((col) => (
                  <PmPanel key={col.horizon} className="flex flex-col border-border/70 bg-muted/30 p-2.5 dark:bg-muted/20">
                    <div className="mb-2.5 flex items-center justify-between gap-2 px-0.5">
                      <span className="text-xs font-semibold uppercase tracking-wide text-foreground">{col.label}</span>
                      <span className="min-w-6 rounded-full border border-border bg-card px-1.5 py-0.5 text-center text-xs font-medium tabular-nums text-foreground" aria-label={`${(grouped[col.horizon] ?? []).length} items`}>
                        {(grouped[col.horizon] ?? []).length}
                      </span>
                    </div>
                    {(grouped[col.horizon] ?? []).length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/70 bg-background/40 px-3 py-5 text-center text-xs text-muted-foreground">No items</div>
                    ) : (
                      <PmStaggerList className="flex flex-col gap-1.5">
                        {(grouped[col.horizon] ?? []).map((item) => (
                          <RoadmapItemCard key={item.id} item={item} onEdit={handleEditItem} onDelete={handleDeleteItem} onMove={handleMove} />
                        ))}
                      </PmStaggerList>
                    )}
                  </PmPanel>
                ))}
            </BuildPaginatedContent>
          </PageState>
        </ManagedProductDetailPrimarySection>
      </ManagedProductDetailShell>

      {createOpen ? <RoadmapItemSheet managedProductId={managedProductId} onClose={handleCloseCreate} /> : null}
      {editTarget ? <RoadmapItemSheet item={editTarget} managedProductId={managedProductId} onClose={handleCloseEdit} /> : null}

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
