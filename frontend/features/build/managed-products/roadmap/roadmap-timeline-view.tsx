"use client";

import { useMemo } from "react";
import { RoadmapItemCard, type ScorableRoadmapItem } from "@/features/build/roadmap/roadmap-item-card";
import { ROADMAP_HORIZON_LABEL } from "@/features/build/roadmap/roadmap-constants";
import { formatCalendarDate } from "@/lib/date-utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { RoadmapHorizon } from "@/types/projects";
import {
  ROADMAP_HORIZON_CAPTION,
  ROADMAP_HORIZON_TONE,
  roadmapTargetDate,
} from "../product-roadmap-model";

interface RoadmapTimelineViewProps {
  items: ScorableRoadmapItem[];
  onEdit: (item: ScorableRoadmapItem) => void;
  onDelete: (item: ScorableRoadmapItem) => void;
}

interface TimelineSectionProps {
  horizon: RoadmapHorizon;
  dated: ScorableRoadmapItem[];
  undated: ScorableRoadmapItem[];
  onEdit: (item: ScorableRoadmapItem) => void;
  onDelete: (item: ScorableRoadmapItem) => void;
}

function TimelineItem({
  item,
  onEdit,
  onDelete,
}: {
  item: ScorableRoadmapItem;
  onEdit: (item: ScorableRoadmapItem) => void;
  onDelete: (item: ScorableRoadmapItem) => void;
}) {
  const rawDate = roadmapTargetDate(item);
  const dateLabel = rawDate ? formatCalendarDate(rawDate) : null;

  return (
    <li className="flex gap-3">
      <div className="w-24 shrink-0 pt-3">
        {rawDate && dateLabel ? (
          <time dateTime={rawDate} className="font-mono text-dense tabular-nums text-muted-foreground">
            {dateLabel}
          </time>
        ) : (
          <span className="text-dense text-muted-foreground">No date</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <RoadmapItemCard item={item} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </li>
  );
}

function TimelineSection({ horizon, dated, undated, onEdit, onDelete }: TimelineSectionProps) {
  const items = [...dated, ...undated];
  const tone = statusToneClasses(ROADMAP_HORIZON_TONE[horizon]);

  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-baseline gap-2">
        <span className={cn("size-2 shrink-0 rounded-full", tone.fill)} aria-hidden />
        <h3 className="text-sm font-semibold text-balance text-foreground">{ROADMAP_HORIZON_LABEL[horizon]}</h3>
        <p className="text-dense text-pretty text-muted-foreground">{ROADMAP_HORIZON_CAPTION[horizon]}</p>
        <span className="ml-auto font-mono text-dense tabular-nums text-muted-foreground">{items.length}</span>
      </header>
      <ol className="flex flex-col gap-2" aria-label={`${ROADMAP_HORIZON_LABEL[horizon]} roadmap items`}>
        {items.map((item) => (
          <TimelineItem key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </ol>
    </section>
  );
}

export function RoadmapTimelineView({ items, onEdit, onDelete }: RoadmapTimelineViewProps) {
  const grouped = useMemo(() => {
    const withDate = items.filter((item) => roadmapTargetDate(item) !== null);
    const withoutDate = items.filter((item) => roadmapTargetDate(item) === null);
    withDate.sort((a, b) => (roadmapTargetDate(a) ?? "").localeCompare(roadmapTargetDate(b) ?? ""));

    const horizons: RoadmapHorizon[] = ["now", "next", "later"];
    return horizons.map((horizon) => ({
      horizon,
      dated: withDate.filter((item) => item.horizon === horizon),
      undated: withoutDate.filter((item) => item.horizon === horizon),
    }));
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {grouped.map((section) => (
        <TimelineSection
          key={section.horizon}
          horizon={section.horizon}
          dated={section.dated}
          undated={section.undated}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
