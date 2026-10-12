"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePositionRoadmapItem, usePublishRoadmapItem } from "@/hooks/api/build/roadmap";
import { useCan } from "@/hooks/api/access";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { type ScorableRoadmapItem } from "@/features/build/roadmap/roadmap-item-card";
import { ROADMAP_HORIZON_COLUMNS } from "@/features/build/roadmap/roadmap-constants";
import type { RoadmapHorizon } from "@/types/projects";
import { RoadmapHorizonColumn } from "./roadmap-horizon-column";

interface RoadmapBoardColumnsProps {
  grouped: Record<RoadmapHorizon, ScorableRoadmapItem[]>;
  onEdit: (item: ScorableRoadmapItem) => void;
  onDelete: (item: ScorableRoadmapItem) => void;
  onView?: (item: ScorableRoadmapItem) => void;
  onCreateInHorizon?: (horizon: RoadmapHorizon) => void;
}

export function RoadmapBoardColumns({
  grouped,
  onEdit,
  onDelete,
  onView,
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
      {ROADMAP_HORIZON_COLUMNS.map((col) => (
        <RoadmapHorizonColumn
          key={col.horizon}
          horizon={col.horizon}
          label={col.label}
          items={grouped[col.horizon] ?? []}
          canManage={canManage}
          onCreate={onCreateInHorizon ? horizonCreateHandlers[col.horizon] : undefined}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
          onMove={handleMove}
          onPublishToggle={handlePublishToggle}
          moveHandlers={moveHandlers}
        />
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
    </div>
  );
}
