"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useRoadmapPublication } from "@/hooks/api/build/roadmap-public";
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
import { statusToneClasses } from "@/lib/design-tokens";
import type { RoadmapHorizon } from "@/types/projects";
import {
  joinReadableMeta,
  ROADMAP_HORIZON_CAPTION,
  ROADMAP_HORIZON_TONE,
  roadmapVoteLabel,
} from "../product-roadmap-model";

interface RoadmapPreviewSheetProps {
  items: ScorableRoadmapItem[];
  managedProductId: number;
  onClose: () => void;
}

function PreviewItem({ item }: { item: ScorableRoadmapItem }) {
  const detail = joinReadableMeta([
    ROADMAP_STATUS_LABEL[String(item.status)] ?? String(item.status),
    item.category,
    item.targetQuarter,
  ]);

  return (
    <li className="flex flex-col gap-1 py-3">
      <div className="flex items-baseline justify-between gap-4">
        <p className="min-w-0 text-sm font-medium text-foreground">{item.title}</p>
        <p className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
          {roadmapVoteLabel(item.votes)}
        </p>
      </div>
      {detail ? <p className="text-dense text-muted-foreground">{detail}</p> : null}
      {item.description ? (
        <p className="line-clamp-2 max-w-[65ch] text-sm text-pretty text-muted-foreground">
          {item.description}
        </p>
      ) : null}
    </li>
  );
}

export function RoadmapPreviewSheet({ items, managedProductId, onClose }: RoadmapPreviewSheetProps) {
  const { data: publication } = useRoadmapPublication();
  const publicPath = publication?.path ? `${publication.path}?product=${String(managedProductId)}` : null;
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
          {publicPath ? (
            <Link
              href={publicPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              Open public page
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">The public board is not published yet.</p>
          )}
        </SheetHeader>
        <SheetBody className="px-6 py-5">
          {publicItems.length === 0 ? (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground">Nothing to preview yet</p>
              <p className="text-sm text-pretty text-muted-foreground">
                Publish an item on the board to see how customers will read this roadmap.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {ROADMAP_HORIZON_COLUMNS.map((column) => {
                const horizonItems = grouped[column.horizon] ?? [];
                const tone = statusToneClasses(ROADMAP_HORIZON_TONE[column.horizon]);
                return (
                  <section key={column.horizon} className="py-5 first:pt-0 last:pb-0">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("size-2 shrink-0 rounded-full", tone.fill)} aria-hidden />
                        <h2 className="text-sm font-medium text-foreground">{column.label}</h2>
                        <span className="font-mono text-sm tabular-nums text-muted-foreground">
                          {horizonItems.length}
                        </span>
                      </div>
                      <p className="text-dense text-muted-foreground">{ROADMAP_HORIZON_CAPTION[column.horizon]}</p>
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
