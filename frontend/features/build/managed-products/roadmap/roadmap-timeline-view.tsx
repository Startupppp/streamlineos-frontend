"use client";

import { useMemo } from "react";
import { RoadmapItemCard, type ScorableRoadmapItem } from "@/features/build/roadmap/roadmap-item-card";
import { ROADMAP_HORIZON_LABEL } from "@/features/build/roadmap/roadmap-constants";
import type { RoadmapHorizon } from "@/types/projects";

interface RoadmapTimelineViewProps {
  items: ScorableRoadmapItem[];
  onEdit: (item: ScorableRoadmapItem) => void;
  onDelete: (item: ScorableRoadmapItem) => void;
}

function itemDateKey(item: ScorableRoadmapItem): string {
  return item.targetEnd ?? item.targetStart ?? "";
}

export function RoadmapTimelineView({ items, onEdit, onDelete }: RoadmapTimelineViewProps) {
  const grouped = useMemo(() => {
    const withDate = items.filter((i) => itemDateKey(i) !== "");
    const withoutDate = items.filter((i) => itemDateKey(i) === "");
    withDate.sort((a, b) => itemDateKey(a).localeCompare(itemDateKey(b)));

    const horizons: RoadmapHorizon[] = ["now", "next", "later"];
    const sections = horizons.map((horizon) => ({
      horizon,
      label: ROADMAP_HORIZON_LABEL[horizon],
      dated: withDate.filter((i) => i.horizon === horizon),
      undated: withoutDate.filter((i) => i.horizon === horizon),
    }));
    return sections;
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {grouped.map((section) => {
        const allItems = [...section.dated, ...section.undated];
        if (allItems.length === 0) return null;
        return (
          <div key={section.horizon}>
            <h3 className="mb-2 text-sm font-semibold text-foreground">
              {section.label}
            </h3>
            <ol className="flex flex-col gap-2" aria-label={`${section.label} roadmap items`}>
              {allItems.map((item) => (
                <li key={item.id}>
                  {itemDateKey(item) ? (
                    <p className="mb-0.5 text-xs text-muted-foreground tabular-nums">
                      {itemDateKey(item)}
                    </p>
                  ) : null}
                  <RoadmapItemCard item={item} onEdit={onEdit} onDelete={onDelete} />
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}
