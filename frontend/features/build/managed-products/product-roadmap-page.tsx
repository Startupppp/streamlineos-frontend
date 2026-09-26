"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRoadmapItems, useDeleteRoadmapItem } from "@/hooks/api/build/roadmap";
import type { RoadmapItem, RoadmapStatus } from "@/types/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { TablePagination, useCursorPager } from "@/components/ui/table-pagination";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { cn } from "@/lib/utils";
import { ROADMAP_COLUMNS } from "@/features/build/roadmap/roadmap-constants";
import { RoadmapItemCard } from "@/features/build/roadmap/roadmap-item-card";
import { RoadmapItemSheet } from "@/features/build/roadmap/roadmap-item-sheet";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { BUILD_FILTER_ALL, useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import {
  PmPageShell,
  PmSection,
  PmPanel,
  PmStaggerList,
  PM_FILL_PANEL,
  PM_PANEL,
} from "@/components/pm-chrome";

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

const ROADMAP_STATUS_OPTS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const ROADMAP_HORIZON_OPTS = [
  { value: BUILD_FILTER_ALL, label: "All horizons" },
  { value: "now", label: "Now" },
  { value: "next", label: "Next" },
  { value: "later", label: "Later" },
];

const ROADMAP_SORT_OPTS = [
  { value: BUILD_FILTER_ALL, label: "Default order" },
  { value: "updated_at", label: "Last updated" },
  { value: "created_at", label: "Created" },
  { value: "title", label: "Title A–Z" },
];

const ROADMAP_FILTER_DEFS = [
  { param: "status", options: ROADMAP_STATUS_OPTS.map((o) => o.value) },
  { param: "horizon" },
  { param: "sort", options: ROADMAP_SORT_OPTS.map((o) => o.value) },
] as const;

export function ProductRoadmapPage({ managedProductId }: ProductRoadmapPageProps) {
  const listFilters = useBuildListFilters({ filters: ROADMAP_FILTER_DEFS });
  const pager = useCursorPager(listFilters.resetKey);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const statusValue = listFilters.value("status");
  const horizonValue = listFilters.value("horizon");
  const sortValue = listFilters.value("sort");

  const typedStatus = useMemo(
    () => (statusValue && statusValue !== BUILD_FILTER_ALL ? (statusValue as RoadmapStatus) : undefined),
    [statusValue],
  );

  const filters = useMemo(
    () => ({
      managedProductId,
      ...(typedStatus ? { status: typedStatus } : {}),
      ...(horizonValue && horizonValue !== BUILD_FILTER_ALL ? { horizon: horizonValue } : {}),
      ...(listFilters.debouncedSearch.trim() ? { search: listFilters.debouncedSearch.trim() } : {}),
      ...(sortValue && sortValue !== BUILD_FILTER_ALL ? { sort: sortValue } : {}),
      cursor: pager.cursor,
    }),
    [managedProductId, typedStatus, horizonValue, sortValue, listFilters.debouncedSearch, pager.cursor],
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
      actions={
        resolution.kind !== "denied" ? (
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
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col gap-4">
          <PageState
            resolution={resolution}
            loading={<RoadmapSkeleton />}
            empty={
              <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="projects"
                title="No roadmap items yet"
                description="Add items to plan what this product is working toward."
                action={{ label: "Add roadmap item", onClick: handleOpenCreate }}
              />
            }
            onRetry={handleRetry}
            className={PM_FILL_PANEL}
          >
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {ROADMAP_COLUMNS.map((col) => (
                  <PmPanel key={col.status} className="flex min-h-[120px] flex-col p-2">
                    <div className="mb-2 flex items-center justify-between px-1">
                      <span className="text-dense font-semibold uppercase tracking-wide text-muted-foreground">{col.label}</span>
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
              </div>
              <TablePagination
                mode="cursor"
                rowCount={(data?.data ?? []).length}
                hasMore={hasNext}
                hasPrevious={pager.hasPrevious}
                onNext={handleNext}
                onPrevious={handlePrev}
              />
            </div>
          </PageState>
        </PmSection>
      </PmPageShell>

      {createOpen ? <RoadmapItemSheet onClose={handleCloseCreate} /> : null}
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
