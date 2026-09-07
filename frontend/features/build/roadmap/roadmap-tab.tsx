"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyProjectsIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRoadmapItems, useDeleteRoadmapItem } from "@/hooks/api/build/roadmap";
import type { RoadmapItem, RoadmapStatus } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { PmPanel, PmStaggerList, PM_FILL_PANEL, PM_PANEL } from "@/components/pm-chrome/pm-chrome";
import { ROADMAP_COLUMNS } from "./roadmap-constants";
import { RoadmapItemCard } from "./roadmap-item-card";
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
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [cursorIdx, setCursorIdx] = useState(0);
  const currentCursor = cursorHistory[cursorIdx];

  const { data, isLoading, isError, refetch } = useRoadmapItems(
    search.trim()
      ? { search: search.trim(), cursor: currentCursor }
      : { cursor: currentCursor },
  );
  const deleteItem = useDeleteRoadmapItem();
  const [internalCreateOpen, setInternalCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RoadmapItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoadmapItem | null>(null);

  useEffect(() => {
    setCursorHistory([undefined]);
    setCursorIdx(0);
  }, [search]);

  const isCreateControlled = onCreateOpenChange !== undefined;
  const sheetOpen = isCreateControlled ? (createOpen ?? false) : internalCreateOpen;

  const grouped = useMemo(() => {
    const map: Record<RoadmapStatus, RoadmapItem[]> = {
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

  const handleEditItem = useCallback((item: RoadmapItem) => {
    setEditTarget(item);
  }, []);

  const handleDeleteItem = useCallback((item: RoadmapItem) => {
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

  function handleNext() {
    const nc = data?.pagination.nextCursor;
    if (!nc) return;
    setCursorHistory((prev) => [...prev.slice(0, cursorIdx + 1), nc]);
    setCursorIdx((prev) => prev + 1);
  }

  function handlePrev() {
    if (cursorIdx === 0) return;
    setCursorIdx((prev) => prev - 1);
  }

  if (isLoading) return <RoadmapBoardSkeleton />;

  if (isError) {
    return (
      <ErrorState className={PM_FILL_PANEL} onRetry={handleRetry} />
    );
  }

  const isEmpty = (data?.data ?? []).length === 0 && cursorIdx === 0;
  const hasPrev = cursorIdx > 0;
  const hasNext = data?.pagination.hasMore ?? false;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {isEmpty ? (
        <EmptyState
          className={PM_FILL_PANEL}
          illustration={<EmptyProjectsIllustration />}
          title="No roadmap items yet"
          description="Plan what's coming and share it publicly with your users."
          action={{ label: "Add roadmap item", onClick: handleOpenSheet }}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {ROADMAP_COLUMNS.map((col) => (
              <PmPanel key={col.status} className="flex min-h-[120px] flex-col p-2">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-dense font-semibold uppercase tracking-wide text-muted-foreground">
                    {col.label}
                  </span>
                  <span className="min-w-[20px] rounded-full border border-border/50 bg-background/80 px-1.5 py-0.5 text-center text-dense tabular-nums text-muted-foreground">
                    {grouped[col.status].length}
                  </span>
                </div>
                {grouped[col.status].length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 py-6 text-center text-xs text-muted-foreground">
                    Empty
                  </div>
                ) : (
                  <PmStaggerList className="flex flex-col gap-1.5">
                    {grouped[col.status].map((item) => (
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
          {(hasPrev || hasNext) ? (
            <div className="flex items-center justify-center gap-2 border-t pt-2">
              <Button variant="ghost" size="sm" onClick={handlePrev} disabled={!hasPrev}>
                Previous
              </Button>
              <Button variant="ghost" size="sm" onClick={handleNext} disabled={!hasNext}>
                Next
              </Button>
            </div>
          ) : null}
        </div>
      )}

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
