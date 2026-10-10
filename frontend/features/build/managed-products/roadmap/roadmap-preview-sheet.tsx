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
import { Badge } from "@/components/ui/badge";
import { ArrowBigUp } from "lucide-react";
import { ROADMAP_HORIZON_COLUMNS, ROADMAP_STATUS_BADGE_VARIANT, ROADMAP_STATUS_LABEL } from "@/features/build/roadmap/roadmap-constants";
import type { ScorableRoadmapItem } from "@/features/build/roadmap/roadmap-item-card";
import type { RoadmapHorizon } from "@/types/projects";

interface RoadmapPreviewSheetProps {
  items: ScorableRoadmapItem[];
  onClose: () => void;
}

interface PreviewCardProps {
  item: ScorableRoadmapItem;
}

function PreviewCard({ item }: PreviewCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <p className="text-sm font-semibold leading-snug text-foreground">{item.title}</p>
      {item.description ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
      ) : null}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border/70 pt-2.5">
        <Badge variant={ROADMAP_STATUS_BADGE_VARIANT[String(item.status)] ?? "outline"} className="text-micro">
          {ROADMAP_STATUS_LABEL[String(item.status)] ?? String(item.status)}
        </Badge>
        {item.category ? (
          <Badge variant="secondary" className="text-micro">{item.category}</Badge>
        ) : null}
        {item.targetQuarter ? (
          <Badge variant="outline" className="text-micro">{item.targetQuarter}</Badge>
        ) : null}
        <span className="ml-auto inline-flex items-center gap-1 text-dense tabular-nums text-muted-foreground">
          <ArrowBigUp className="h-3.5 w-3.5" />
          {item.votes}
        </span>
      </div>
    </div>
  );
}

export function RoadmapPreviewSheet({ items, onClose }: RoadmapPreviewSheetProps) {
  const publicItems = useMemo(
    () => items.filter((i) => i.isPublic),
    [items],
  );

  const grouped = useMemo(() => {
    const map: Record<RoadmapHorizon, ScorableRoadmapItem[]> = { now: [], next: [], later: [] };
    for (const item of publicItems) {
      map[item.horizon ?? "later"].push(item);
    }
    return map;
  }, [publicItems]);

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-3xl p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>Public Roadmap Preview</SheetTitle>
          <SheetDescription>
            {publicItems.length === 0
              ? "No items are marked as public. Mark items public to show them here."
              : `${String(publicItems.length)} item${publicItems.length === 1 ? "" : "s"} visible to the public.`}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="px-6 py-5 overflow-y-auto">
          {publicItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {ROADMAP_HORIZON_COLUMNS.map((col) => (
                <div key={col.horizon}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">{col.label}</p>
                  <div className="flex flex-col gap-2">
                    {(grouped[col.horizon] ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">No items</p>
                    ) : (
                      (grouped[col.horizon] ?? []).map((item) => (
                        <PreviewCard key={item.id} item={item} />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
