"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePositionRoadmapItem, usePublishRoadmapItem } from "@/hooks/api/build/roadmap";
import { useCan } from "@/hooks/api/access";
import { PmStaggerList } from "@/components/pm-chrome";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RoadmapItemCard, type ScorableRoadmapItem } from "@/features/build/roadmap/roadmap-item-card";
import { ROADMAP_HORIZON_COLUMNS } from "@/features/build/roadmap/roadmap-constants";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import type { RoadmapHorizon } from "@/types/projects";

const HORIZON_TONES: Record<RoadmapHorizon, StatusTone> = {
  now: "success",
  next: "info",
  later: "neutral",
};

interface RoadmapBoardColumnsProps {
  grouped: Record<RoadmapHorizon, ScorableRoadmapItem[]>;
  onEdit: (item: ScorableRoadmapItem) => void;
  onDelete: (item: ScorableRoadmapItem) => void;
  onCreateInHorizon?: (horizon: RoadmapHorizon) => void;
}

export function RoadmapBoardColumns({
  grouped,
  onEdit,
  onDelete,
  onCreateInHorizon,
}: RoadmapBoardColumnsProps) {
  const canManage = useCan("build:roadmap:manage");
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

  const handleMove = useCallback(
    (item: ScorableRoadmapItem, horizon: RoadmapHorizon) => {
      positionItem.mutate(
        { roadmapItemId: item.id, version: item.version, horizon },
        { onError: (e) => toast.error(getErrorMessage(e)) },
      );
    },
    [positionItem],
  );

  const moveHandlers = useMemo(() => {
    const result: Record<number, { up?: () => void; down?: () => void }> = {};
    for (const col of ROADMAP_HORIZON_COLUMNS) {
      const items = grouped[col.horizon] ?? [];
      items.forEach((item, idx) => {
        const above = items[idx - 1];
        const below = items[idx + 1];
        result[item.id] = {
          up: above
            ? () =>
                positionItem.mutate(
                  { roadmapItemId: item.id, version: item.version, beforeItemId: above.id },
                  { onError: (e) => toast.error(getErrorMessage(e)) },
                )
            : undefined,
          down: below
            ? () =>
                positionItem.mutate(
                  { roadmapItemId: item.id, version: item.version, afterItemId: below.id },
                  { onError: (e) => toast.error(getErrorMessage(e)) },
                )
            : undefined,
        };
      });
    }
    return result;
  }, [grouped, positionItem]);

  const horizonCreateHandlers = useMemo(
    () => ({
      now: () => onCreateInHorizon?.("now"),
      next: () => onCreateInHorizon?.("next"),
      later: () => onCreateInHorizon?.("later"),
    }),
    [onCreateInHorizon],
  );

  return (
    <div data-testid="roadmap-board-columns" className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
      {ROADMAP_HORIZON_COLUMNS.map((col) => {
        const tone = HORIZON_TONES[col.horizon];
        const toneClasses = statusToneClasses(tone);
        const items = grouped[col.horizon] ?? [];
        return (
          <div
            key={col.horizon}
            className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-card shadow-sm"
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", toneClasses.fill)} aria-hidden />
                <span className="text-sm font-semibold text-foreground">{col.label}</span>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    "min-w-5 rounded-full border px-1.5 py-0.5 text-center tabular-nums text-micro font-semibold",
                    toneClasses.surface,
                    toneClasses.ink,
                    toneClasses.rule,
                  )}
                  aria-label={`${items.length} items`}
                >
                  {items.length}
                </span>
                {canManage && onCreateInHorizon && items.length > 0 ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    aria-label={`Add item to ${col.label}`}
                    onClick={horizonCreateHandlers[col.horizon]}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 bg-background/40 px-3 py-6 text-center">
                  <p className="text-xs text-muted-foreground">No items yet</p>
                  {canManage && onCreateInHorizon ? (
                    <button
                      type="button"
                      onClick={horizonCreateHandlers[col.horizon]}
                      className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                    >
                      + Add item
                    </button>
                  ) : null}
                </div>
              ) : (
                <PmStaggerList className="flex flex-col gap-1.5">
                  {items.map((item) => (
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
            </div>
          </div>
        );
      })}
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
    </div>
  );
}
