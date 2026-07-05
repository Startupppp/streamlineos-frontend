"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyProjectsIllustration } from "@/components/illustrations";
import { LoadingState } from "@/components/shared/loading-state";
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
import { ROADMAP_COLUMNS } from "./roadmap-constants";
import { RoadmapItemCard } from "./roadmap-item-card";
import { RoadmapItemSheet } from "./roadmap-item-sheet";

interface RoadmapTabProps {
  search: string;
}

export function RoadmapTab({ search }: RoadmapTabProps) {
  const { data, isLoading, isError, refetch } = useRoadmapItems(
    search.trim() ? { search: search.trim() } : {},
  );
  const deleteItem = useDeleteRoadmapItem();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RoadmapItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoadmapItem | null>(null);

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

  function handleRetry() { refetch(); }
  function handleOpenSheet() { setSheetOpen(true); }
  function handleCloseSheet() { setSheetOpen(false); }
  function handleCloseEdit() { setEditTarget(null); }
  function handleDeleteDialogChange(open: boolean) { if (!open) setDeleteTarget(null); }
  function handleEditItem(item: RoadmapItem) { setEditTarget(item); }
  function handleDeleteItem(item: RoadmapItem) { setDeleteTarget(item); }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteItem.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Roadmap item deleted"); setDeleteTarget(null); },
      onError: () => toast.error("Failed to delete item"),
    });
  }

  if (isLoading) return <LoadingState variant="cards" rows={6} />;
  if (isError) return <ErrorState onRetry={handleRetry} />;

  const total = data?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total} items</p>
        <Button size="sm" onClick={handleOpenSheet}>
          <Plus className="h-4 w-4 mr-1" /> New Item
        </Button>
      </div>

      {total === 0 ? (
        <EmptyState
          illustration={<EmptyProjectsIllustration />}
          title="No roadmap items yet"
          description="Plan what's coming and share it publicly with your users."
          action={{ label: "Add roadmap item", onClick: handleOpenSheet }}
          className="flex-1"
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ROADMAP_COLUMNS.map((col) => (
            <div key={col.status} className="bg-muted/30 rounded-xl p-2 min-h-[120px]">
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {col.label}
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums bg-background rounded-full px-1.5 py-0.5 border border-border/50 min-w-[20px] text-center">
                  {grouped[col.status].length}
                </span>
              </div>
              <div>
                {grouped[col.status].length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 py-6 text-center text-xs text-muted-foreground">
                    Empty
                  </div>
                ) : (
                  grouped[col.status].map((item) => (
                    <RoadmapItemCard
                      key={item.id}
                      item={item}
                      onEdit={handleEditItem}
                      onDelete={handleDeleteItem}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {sheetOpen && <RoadmapItemSheet onClose={handleCloseSheet} />}
      {editTarget && <RoadmapItemSheet item={editTarget} onClose={handleCloseEdit} />}

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
