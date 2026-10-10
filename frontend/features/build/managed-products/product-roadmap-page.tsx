"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRoadmapItems, useDeleteRoadmapItem } from "@/hooks/api/build/roadmap";
import type { RoadmapItem, RoadmapStatus } from "@/types/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
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
import { cn } from "@/lib/utils";
import { ROADMAP_COLUMNS } from "@/features/build/roadmap/roadmap-constants";
import { RoadmapItemCard } from "@/features/build/roadmap/roadmap-item-card";
import { RoadmapItemSheet } from "@/features/build/roadmap/roadmap-item-sheet";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BUILD_FILTER_ALL, useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import {
  PmPanel,
  PmStaggerList,
  CONTENT_FILL_PANEL,
  PM_PANEL,
} from "@/components/pm-chrome";
import {
  ROADMAP_STATUS_OPTS,
  ROADMAP_SORT_OPTS,
  ROADMAP_FILTER_DEFS,
} from "./product-roadmap-model";
import {
  MANAGED_PRODUCT_DETAIL_CONTENT_CLASS,
  ManagedProductDetailPrimarySection,
  ManagedProductDetailShell,
} from "./managed-product-detail-layout";

interface ProductRoadmapPageProps {
  managedProductId: number;
}

export function RoadmapSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={cn(PM_PANEL, "min-h-[140px] space-y-2 p-2")}>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function ProductRoadmapPage({ managedProductId }: ProductRoadmapPageProps) {
  const canManage = useCan("build:roadmap:manage");
  const listFilters = useBuildListFilters({ filters: ROADMAP_FILTER_DEFS });
  const pager = useBuildCursorPager(listFilters.resetKey);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const statusValue = listFilters.value("status");
  const sortValue = listFilters.value("sort");

  const typedStatus = useMemo<RoadmapStatus | undefined>(() => {
    if (!statusValue || statusValue === BUILD_FILTER_ALL) return undefined;
    if (statusValue === "planned" || statusValue === "in_progress" || statusValue === "completed" || statusValue === "cancelled") return statusValue;
    return undefined;
  }, [statusValue]);

  const filters = useMemo(
    () => ({
      managedProductId,
      ...(typedStatus ? { status: typedStatus } : {}),
      ...(listFilters.debouncedSearch.trim() ? { search: listFilters.debouncedSearch.trim() } : {}),
      ...(sortValue && sortValue !== BUILD_FILTER_ALL ? { sort: sortValue } : {}),
      cursor: pager.cursor,
    }),
    [managedProductId, typedStatus, sortValue, listFilters.debouncedSearch, pager.cursor],
  );

  const { data, isLoading, isError, error, refetch } = useRoadmapItems(filters);
  const deleteItem = useDeleteRoadmapItem();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RoadmapItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoadmapItem | null>(null);

  const grouped = useMemo(() => {
    const map: Record<string, RoadmapItem[]> = { planned: [], in_progress: [], completed: [], cancelled: [] };
    for (const item of data?.data ?? []) map[item.status]?.push(item);
    return map;
  }, [data]);

  const resolution = usePageState({
    permission: "build:roadmap:view",
    isLoading,
    isError,
    error,
    isEmpty: (data?.data ?? []).length === 0 && !pager.hasPrevious,
  });

  const handleEditItem = useCallback((item: RoadmapItem) => { setEditTarget(item); }, []);
  const handleDeleteItem = useCallback((item: RoadmapItem) => { setDeleteTarget(item); }, []);

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
    itemCount: 0,
    onOpen: () => undefined,
    onClearSelection: () => undefined,
    searchInputRef,
    enabled: !createOpen && !editTarget && !deleteTarget,
  });

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
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
            loading={<RoadmapSkeleton />}
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
              contentClassName="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
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
                {ROADMAP_COLUMNS.map((col) => (
                  <PmPanel key={col.status} className="flex min-h-[120px] flex-col p-2">
                    <div className="mb-2 flex items-center justify-between px-1">
                      <span className="text-dense font-medium uppercase tracking-wide text-muted-foreground">{col.label}</span>
                      <span className="min-w-[20px] rounded-full border border-border/50 bg-background/80 px-1.5 py-0.5 text-center text-dense tabular-nums text-muted-foreground">
                        {(grouped[col.status] ?? []).length}
                      </span>
                    </div>
                    {(grouped[col.status] ?? []).length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/60 py-6 text-center text-xs text-muted-foreground">Empty</div>
                    ) : (
                      <PmStaggerList className="flex flex-col gap-1.5">
                        {(grouped[col.status] ?? []).map((item) => (
                          <RoadmapItemCard key={item.id} item={item} onEdit={handleEditItem} onDelete={handleDeleteItem} />
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
      {editTarget ? <RoadmapItemSheet item={editTarget} onClose={handleCloseEdit} /> : null}

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
