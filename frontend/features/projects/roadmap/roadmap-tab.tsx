"use client";

import { useMemo, useState, useCallback } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyProjectsIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useRoadmapItems, useDeleteRoadmapItem } from "@/hooks/api/projects/roadmap";
import type { RoadmapItem, RoadmapStatus } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { PmPanel, PmStaggerList, PM_PANEL } from "@/features/projects/shared/pm-chrome";
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

export function RoadmapTab({ search, createOpen, onCreateOpenChange }: RoadmapTabProps) {
  const { data, isLoading, isError, refetch } = useRoadmapItems(
    search.trim() ? { search: search.trim() } : {},
  );
  const deleteItem = useDeleteRoadmapItem();
  const [internalCreateOpen, setInternalCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RoadmapItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoadmapItem | null>(null);

  const isCreateControlled = onCreateOpenChange !== undefined;
  const sheetOpen = isCreateControlled ? (createOpen ?? false) : internalCreateOpen;

  const grouped = useMemo(() => {
    const map: Record<RoadmapStatus, RoadmapItem[]> = {
      planned: [],
      in_progress: [],
      completed: [],
      cancelled: [],
    };
    for (const item of data ?? []) map[item.status].push(item);
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

  if (isLoading) return <RoadmapBoardSkeleton />;

  if (isError) {
    return (
      <PmPanel className="flex min-h-[14rem] items-center justify-center p-6">
        <ErrorState onRetry={handleRetry} />
      </PmPanel>
    );
  }

  const total = data?.length ?? 0;

  return (
    <div className="space-y-4">
      {total === 0 ? (
        <PmPanel className="flex min-h-[14rem] items-center justify-center p-6">
          <EmptyState
            illustration={<EmptyProjectsIllustration />}
            title="No roadmap items yet"
            description="Plan what's coming and share it publicly with your users."
            action={{ label: "Add roadmap item", onClick: handleOpenSheet }}
            className="min-h-[12rem]"
          />
        </PmPanel>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ROADMAP_COLUMNS.map((col) => (
            <PmPanel key={col.status} className="flex min-h-[120px] flex-col p-2">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {col.label}
                </span>
                <span className="min-w-[20px] rounded-full border border-border/50 bg-background/80 px-1.5 py-0.5 text-center text-[11px] tabular-nums text-muted-foreground">
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
      )}

      {sheetOpen ? <RoadmapItemSheet onClose={handleCloseSheet} /> : null}
      {editTarget ? <RoadmapItemSheet item={editTarget} onClose={handleCloseEdit} /> : null}

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete roadmap item?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
