"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useRoadmapItem } from "@/hooks/api/build/roadmap";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserDisplayName } from "@/lib/person-display";
import { ROADMAP_HORIZON_LABEL, ROADMAP_STATUS_BADGE_VARIANT, ROADMAP_STATUS_LABEL } from "@/features/build/roadmap/roadmap-constants";

interface RoadmapInitiativePaneProps {
  itemId: number | null;
}

export function RoadmapInitiativePane({ itemId }: RoadmapInitiativePaneProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const focusReturnRef = useRef<Element | null>(null);

  const { data: item, isLoading } = useRoadmapItem(itemId);

  useEffect(() => {
    if (itemId !== null) {
      focusReturnRef.current = document.activeElement;
    }
  }, [itemId]);

  const handleClose = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("item");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    const el = focusReturnRef.current;
    if (el instanceof HTMLElement) {
      setTimeout(() => { el.focus(); }, 50);
    }
  }, [router, pathname, searchParams]);

  const open = itemId !== null;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <SheetContent
        side="right"
        className="flex w-full flex-col sm:max-w-md max-sm:inset-0 max-sm:max-w-none max-sm:rounded-none"
      >
        <SheetHeader>
          <SheetTitle>
            {isLoading ? <Skeleton className="h-5 w-48" /> : (item?.title ?? "Roadmap item")}
          </SheetTitle>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-4 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : item ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={ROADMAP_STATUS_BADGE_VARIANT[String(item.status)] ?? "outline"}>
                  {ROADMAP_STATUS_LABEL[String(item.status)] ?? String(item.status)}
                </Badge>
                {item.horizon ? (
                  <Badge variant="outline">{ROADMAP_HORIZON_LABEL[item.horizon]}</Badge>
                ) : null}
                {item.isPublic ? <Badge variant="secondary">Public</Badge> : null}
              </div>

              {item.description ? (
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
                  <p className="text-sm text-foreground">{item.description}</p>
                </div>
              ) : null}

              {item.outcome ? (
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Outcome</p>
                  <p className="text-sm text-foreground">{item.outcome}</p>
                </div>
              ) : null}

              {(item.reach != null || item.impact != null || item.confidence != null || item.effort != null) ? (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">RICE</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "Reach", value: item.reach },
                      { label: "Impact", value: item.impact },
                      { label: "Confidence", value: item.confidence != null ? `${item.confidence}%` : null },
                      { label: "Effort", value: item.effort },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex flex-col items-center rounded-lg border border-border p-2 gap-0.5">
                        <span className="font-mono text-sm font-semibold tabular-nums">{value ?? "—"}</span>
                        <span className="text-micro text-muted-foreground">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {item.owner ? (
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Owner</p>
                  <p className="text-sm">{getUserDisplayName(item.owner)}</p>
                </div>
              ) : null}

              {item.goal ? (
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Goal</p>
                  <p className="text-sm">{item.goal.title}</p>
                </div>
              ) : null}

              {item.release ? (
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Release</p>
                  <p className="text-sm">{item.release.name}</p>
                </div>
              ) : null}

              {item.team ? (
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Team</p>
                  <p className="text-sm">{item.team.name}</p>
                </div>
              ) : null}

              {item.targetQuarter ? (
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Target</p>
                  <p className="text-sm">{item.targetQuarter}</p>
                </div>
              ) : null}

              {item.votes > 0 ? (
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Votes</p>
                  <p className="text-sm font-mono tabular-nums">{item.votes}</p>
                </div>
              ) : null}
            </>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
