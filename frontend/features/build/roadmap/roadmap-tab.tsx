"use client";

import { useMemo, useState, useCallback } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TablePagination, useCursorPager } from "@/components/ui/table-pagination";
import { toast } from "sonner";
import { useRoadmapItems, useDeleteRoadmapItem } from "@/hooks/api/build/roadmap";
import type { RoadmapStatus } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { PmPanel, PmStaggerList, PM_FILL_PANEL, PM_PANEL } from "@/components/pm-chrome";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { ROADMAP_COLUMNS } from "./roadmap-constants";
import { RoadmapItemCard, type ScorableRoadmapItem } from "./roadmap-item-card";
import { RoadmapItemSheet } from "./roadmap-item-sheet";

interface RoadmapTabProps {
  search: string;
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
}

function RoadmapBoardSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={cn(PM_PANEL, "min-h-[140px] space-y-2 p-2")}>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function RoadmapTab({ search, createOpen, onCreateOpenChange }: RoadmapTabProps) {
  const pager = useCursorPager(search.trim());

  const { data, isLoading, isError, error, refetch } = useRoadmapItems(
    search.trim()
      ? { search: search.trim(), cursor: pager.cursor }
      : { cursor: pager.cursor },
  );
  const deleteItem = useDeleteRoadmapItem();
  const [internalCreateOpen, setInternalCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ScorableRoadmapItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScorableRoadmapItem | null>(null);

  const isEmpty = (data?.data ?? []).length === 0 && !pager.hasPrevious;

  const resolution = usePageState({
    permission: "build:roadmap:view",
    isLoading,
    isError,
    error,
    isEmpty,
  });

  const isCreateControlled = onCreateOpenChange !== undefined;
  const sheetOpen = isCreateControlled ? (createOpen ?? false) : internalCreateOpen;

  const grouped = useMemo(() => {
    const map: Record<string, ScorableRoadmapItem[]> = {
      planned: [],
      in_progress: [],
      completed: [],
      cancelled: [],
    };
    for (const item of data?.data ?? []) map[item.status].push(item);
    return map;
  }, [data]);

  function handleRetry() {
    void refetch();
  }

  function handleOpenSheet() {
    if (isCreateControlled) onCreateOpenChange(true);
    else setInternalCreateOpen(true);
  }

  function handleCloseSheet() {
    if (isCreateControlled) onCreateOpenChange(false);
    else setInternalCreateOpen(false);
  }

  function handleCloseEdit() {
    setEditTarget(null);
  }

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  const handleEditItem = useCallback((item: ScorableRoadmapItem) => {
    setEditTarget(item);
  }, []);

  const handleDeleteItem = useCallback((item: ScorableRoadmapItem) => {
    setDeleteTarget(item);
  }, []);

  function handleDelete() {
    if (!deleteTarget) return;
    deleteItem.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Roadmap item deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  const handleNext = useCallback(() => {
    pager.goNext(data?.pagination.nextCursor);
  }, [pager, data?.pagination.nextCursor]);

  const handlePrev = useCallback(() => {
    pager.goPrevious();
  }, [pager]);

  const hasNext = data?.pagination.hasMore ?? false;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageState
        resolution={resolution}
        loading={<RoadmapBoardSkeleton />}
        empty={
          <EmptyState
            className={PM_FILL_PANEL}
            illustrationPreset="projects"
            title="No roadmap items yet"
            description="Plan what's coming and share it publicly with your users."
            action={{ label: "Add roadmap item", onClick: handleOpenSheet }}
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
                  <span className="text-dense font-semibold uppercase tracking-wide text-muted-foreground">
                    {col.label}
                  </span>
                  <span className="min-w-[20px] rounded-full border border-border/50 bg-background/80 px-1.5 py-0.5 text-center text-dense tabular-nums text-muted-foreground">
                    {(grouped[col.status as RoadmapStatus] ?? []).length}
                  </span>
                </div>
                {(grouped[col.status as RoadmapStatus] ?? []).length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 py-6 text-center text-xs text-muted-foreground">
                    Empty
                  </div>
                ) : (
                  <PmStaggerList className="flex flex-col gap-1.5">
                    {(grouped[col.status as RoadmapStatus] ?? []).map((item) => (
                      <RoadmapItemCard
                        key={item.id}
                        item={item}
                        onEdit={handleEditItem}
                        onDelete={handleDeleteItem}
                      />
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

      {sheetOpen ? <RoadmapItemSheet onClose={handleCloseSheet} /> : null}
      {editTarget ? <RoadmapItemSheet item={editTarget} onClose={handleCloseEdit} /> : null}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
        title="Delete roadmap item?"
        description={`"${deleteTarget?.title ?? ""}" will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
