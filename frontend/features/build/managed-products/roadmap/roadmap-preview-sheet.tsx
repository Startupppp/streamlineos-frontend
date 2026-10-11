"use client";

import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import {
  ROADMAP_HORIZON_COLUMNS,
  ROADMAP_STATUS_LABEL,
} from "@/features/build/roadmap/roadmap-constants";
import type { ScorableRoadmapItem } from "@/features/build/roadmap/roadmap-item-card";
import { cn } from "@/lib/utils";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import type { RoadmapHorizon } from "@/types/projects";

const HORIZON_TONES: Record<RoadmapHorizon, StatusTone> = {
  now: "success",
  next: "info",
  later: "neutral",
};

interface RoadmapPreviewSheetProps {
  items: ScorableRoadmapItem[];
  onClose: () => void;
}

function voteLabel(votes: number) {
  return `${votes} ${votes === 1 ? "vote" : "votes"}`;
}

function PreviewItem({ item }: { item: ScorableRoadmapItem }) {
  const status = ROADMAP_STATUS_LABEL[String(item.status)] ?? String(item.status);
  const detail = [status, item.category, item.targetQuarter].filter(Boolean).join(" · ");

  return (
    <li className="py-3">
      <div className="flex items-baseline justify-between gap-4">
        <p className="min-w-0 text-sm text-foreground">
          <span className="font-medium">{item.title}</span>
          <span className="text-muted-foreground"> · {detail}</span>
        </p>
        <p className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
          {voteLabel(item.votes)}
        </p>
      </div>
      {item.description ? (
        <p className="mt-1 line-clamp-2 max-w-[65ch] text-sm text-muted-foreground text-pretty">
          {item.description}
        </p>
      ) : null}
    </li>
  );
}

export function RoadmapPreviewSheet({ items, onClose }: RoadmapPreviewSheetProps) {
  const publicItems = useMemo(
    () => items.filter((item) => item.isPublic),
    [items],
  );

  const grouped = useMemo(() => {
    const map: Record<RoadmapHorizon, ScorableRoadmapItem[]> = { now: [], next: [], later: [] };
    for (const item of publicItems) {
      map[item.horizon ?? "later"].push(item);
    }
    return map;
  }, [publicItems]);

  const countLabel =
    publicItems.length === 0
      ? "No items are marked as public. Mark items public to show them here."
      : `${String(publicItems.length)} item${publicItems.length === 1 ? "" : "s"} visible to the public.`;

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="gap-1 border-b px-6 py-4 text-left">
          <SheetTitle>Public Roadmap Preview</SheetTitle>
          <SheetDescription>{countLabel}</SheetDescription>
        </SheetHeader>
        <SheetBody className="px-6 py-5">
          {publicItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {ROADMAP_HORIZON_COLUMNS.map((column) => {
                const horizonItems = grouped[column.horizon] ?? [];
                const tone = statusToneClasses(HORIZON_TONES[column.horizon]);
                return (
                  <section key={column.horizon} className="py-5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("size-2 shrink-0 rounded-full", tone.fill)} aria-hidden />
                      <h2 className="text-sm font-medium text-foreground">{column.label}</h2>
                      <span className="font-mono text-sm tabular-nums text-muted-foreground">
                        {horizonItems.length}
                      </span>
                    </div>
                    {horizonItems.length === 0 ? (
                      <p className="mt-2 text-sm text-muted-foreground">Nothing public here.</p>
                    ) : (
                      <ul className="mt-1 divide-y divide-border">
                        {horizonItems.map((item) => (
                          <PreviewItem key={item.id} item={item} />
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
