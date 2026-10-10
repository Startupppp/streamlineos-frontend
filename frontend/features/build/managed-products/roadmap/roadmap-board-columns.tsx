"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePositionRoadmapItem, usePublishRoadmapItem } from "@/hooks/api/build/roadmap";
import { PmPanel, PmStaggerList } from "@/components/pm-chrome";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RoadmapItemCard, type ScorableRoadmapItem } from "@/features/build/roadmap/roadmap-item-card";
import { ROADMAP_HORIZON_COLUMNS } from "@/features/build/roadmap/roadmap-constants";
import type { RoadmapHorizon } from "@/types/projects";

interface RoadmapBoardColumnsProps {
  grouped: Record<RoadmapHorizon, ScorableRoadmapItem[]>;
  onEdit: (item: ScorableRoadmapItem) => void;
  onDelete: (item: ScorableRoadmapItem) => void;
}

export function RoadmapBoardColumns({ grouped, onEdit, onDelete }: RoadmapBoardColumnsProps) {
  const positionItem = usePositionRoadmapItem();
  const publishItem = usePublishRoadmapItem();
  const [publishTarget, setPublishTarget] = useState<ScorableRoadmapItem | null>(null);

  const handlePublishToggle = useCallback((item: ScorableRoadmapItem) => {
    setPublishTarget(item);
  }, []);

  const handlePublishConfirmed = useCallback(() => {
    if (!publishTarget) return;
    publishItem.mutate(
      { roadmapItemId: publishTarget.id, version: publishTarget.version, isPublic: !publishTarget.isPublic },
      {
        onSuccess: () => {
          toast.success(publishTarget.isPublic ? "Item unpublished" : "Item published");
          setPublishTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [publishTarget, publishItem]);

  const handlePublishOpenChange = useCallback((open: boolean) => {
    if (!open) setPublishTarget(null);
  }, []);

  const handleMove = useCallback((item: ScorableRoadmapItem, horizon: RoadmapHorizon) => {
    positionItem.mutate(
      { roadmapItemId: item.id, version: item.version, horizon },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  }, [positionItem]);

  const moveHandlers = useMemo(() => {
    const result: Record<number, { up?: () => void; down?: () => void }> = {};
    for (const col of ROADMAP_HORIZON_COLUMNS) {
      const items = grouped[col.horizon] ?? [];
      items.forEach((item, idx) => {
        const above = items[idx - 1];
        const below = items[idx + 1];
        result[item.id] = {
          up: above
            ? () => positionItem.mutate(
                { roadmapItemId: item.id, version: item.version, beforeItemId: above.id },
                { onError: (e) => toast.error(getErrorMessage(e)) },
              )
            : undefined,
          down: below
            ? () => positionItem.mutate(
                { roadmapItemId: item.id, version: item.version, afterItemId: below.id },
                { onError: (e) => toast.error(getErrorMessage(e)) },
              )
            : undefined,
        };
      });
    }
    return result;
  }, [grouped, positionItem]);

  return (
    <>
      {ROADMAP_HORIZON_COLUMNS.map((col) => (
        <PmPanel key={col.horizon} className="flex flex-col border-border/70 bg-muted/30 p-2.5 dark:bg-muted/20">
          <div className="mb-2.5 flex items-center justify-between gap-2 px-0.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground">{col.label}</span>
            <span
              className="min-w-6 rounded-full border border-border bg-card px-1.5 py-0.5 text-center text-xs font-medium tabular-nums text-foreground"
              aria-label={`${(grouped[col.horizon] ?? []).length} items`}
            >
              {(grouped[col.horizon] ?? []).length}
            </span>
          </div>
          {(grouped[col.horizon] ?? []).length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 bg-background/40 px-3 py-5 text-center text-xs text-muted-foreground">
              No items
            </div>
          ) : (
            <PmStaggerList className="flex flex-col gap-1.5">
              {(grouped[col.horizon] ?? []).map((item) => (
                <RoadmapItemCard
                  key={item.id}
                  item={item}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onMove={handleMove}
                  onMoveUp={moveHandlers[item.id]?.up}
                  onMoveDown={moveHandlers[item.id]?.down}
                  onPublishToggle={handlePublishToggle}
                />
              ))}
            </PmStaggerList>
          )}
        </PmPanel>
      ))}
      <ConfirmDialog
        open={!!publishTarget}
        onOpenChange={handlePublishOpenChange}
        title={publishTarget?.isPublic ? "Unpublish item?" : "Publish item?"}
        description={
          publishTarget?.isPublic
            ? "This item will be removed from the public roadmap board."
            : "This item will appear on the public roadmap board."
        }
        confirmLabel={publishTarget?.isPublic ? "Unpublish" : "Publish"}
        destructive={publishTarget?.isPublic ?? false}
        onConfirm={handlePublishConfirmed}
        isPending={publishItem.isPending}
      />
    </>
  );
}
