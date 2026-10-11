"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PmStaggerList } from "@/components/pm-chrome";
import { RoadmapItemCard, type ScorableRoadmapItem } from "@/features/build/roadmap/roadmap-item-card";
import { cn } from "@/lib/utils";
import { statusToneClasses } from "@/lib/design-tokens";
import type { RoadmapHorizon } from "@/types/projects";
import {
  ROADMAP_HORIZON_CAPTION,
  ROADMAP_HORIZON_EMPTY,
  ROADMAP_HORIZON_TONE,
} from "../product-roadmap-model";

interface RoadmapHorizonColumnProps {
  horizon: RoadmapHorizon;
  label: string;
  items: ScorableRoadmapItem[];
  canManage: boolean;
  onCreate?: () => void;
  onEdit: (item: ScorableRoadmapItem) => void;
  onDelete: (item: ScorableRoadmapItem) => void;
  onMove: (item: ScorableRoadmapItem, horizon: RoadmapHorizon) => void;
  onPublishToggle: (item: ScorableRoadmapItem) => void;
  moveHandlers: Record<number, { up?: () => void; down?: () => void }>;
}

export function RoadmapHorizonColumn({
  horizon,
  label,
  items,
  canManage,
  onCreate,
  onEdit,
  onDelete,
  onMove,
  onPublishToggle,
  moveHandlers,
}: RoadmapHorizonColumnProps) {
  const tone = statusToneClasses(ROADMAP_HORIZON_TONE[horizon]);
  const headingId = `roadmap-horizon-${horizon}`;

  return (
    <section
      aria-labelledby={headingId}
      className="flex min-h-0 min-w-72 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <header className="flex shrink-0 items-start justify-between gap-2 border-b border-border px-3 py-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className={cn("size-2 shrink-0 rounded-full", tone.fill)} aria-hidden />
            <h2 id={headingId} className="text-sm font-semibold text-balance text-foreground">
              {label}
            </h2>
          </div>
          <p className="text-dense text-pretty text-muted-foreground">{ROADMAP_HORIZON_CAPTION[horizon]}</p>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "min-w-5 rounded-full border px-1.5 py-0.5 text-center font-mono text-micro font-semibold tabular-nums",
              tone.surface,
              tone.ink,
              tone.rule,
            )}
            aria-label={`${items.length} items`}
          >
            {items.length}
          </span>
          {canManage && onCreate && items.length > 0 ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              aria-label={`Add item to ${label}`}
              onClick={onCreate}
            >
              <Plus className="size-3.5" aria-hidden />
            </Button>
          ) : null}
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-3 py-6 text-center">
            <p className="text-sm font-medium text-foreground">No items yet</p>
            <p className="max-w-xs text-dense text-pretty text-muted-foreground">
              {ROADMAP_HORIZON_EMPTY[horizon]}
            </p>
            {canManage && onCreate ? (
              <Button type="button" variant="ghost" size="sm" onClick={onCreate}>
                + Add item
              </Button>
            ) : null}
          </div>
        ) : (
          <PmStaggerList className="flex flex-col gap-2">
            {items.map((item) => (
              <RoadmapItemCard
                key={item.id}
                item={item}
                onEdit={onEdit}
                onDelete={onDelete}
                onMove={onMove}
                onMoveUp={moveHandlers[item.id]?.up}
                onMoveDown={moveHandlers[item.id]?.down}
                onPublishToggle={onPublishToggle}
              />
            ))}
          </PmStaggerList>
        )}
      </div>
    </section>
  );
}
