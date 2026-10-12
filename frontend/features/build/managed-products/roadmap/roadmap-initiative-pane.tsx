"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useRoadmapItem } from "@/hooks/api/build/roadmap";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserDisplayName } from "@/lib/person-display";
import { TicketDetailPane } from "@/features/build/ticket-details/ticket-detail-pane";
import { OpportunityPane } from "@/features/build/managed-products/insights/opportunity-pane";
import { ROADMAP_HORIZON_LABEL, ROADMAP_STATUS_BADGE_VARIANT, ROADMAP_STATUS_LABEL } from "@/features/build/roadmap/roadmap-constants";

const FOCUS_RESTORE_DELAY_MS = 50;

interface RoadmapInitiativePaneProps {
  itemId: number | null;
}

export function RoadmapInitiativePane({ itemId }: RoadmapInitiativePaneProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const focusReturnRef = useRef<Element | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: item, isLoading } = useRoadmapItem(itemId);

  const ticketId = searchParams.get("ticket") ? Number(searchParams.get("ticket")) : null;
  const ticketProjectId = searchParams.get("ticketProject") ? Number(searchParams.get("ticketProject")) : null;
  const opportunityId = searchParams.get("opportunity") ? Number(searchParams.get("opportunity")) : null;

  useEffect(() => {
    if (itemId !== null) { focusReturnRef.current = document.activeElement; }
  }, [itemId]);

  useEffect(
    () => () => {
      if (focusTimerRef.current !== null) {
        clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
    },
    [],
  );

  const handleClose = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("item"); next.delete("ticket"); next.delete("ticketProject"); next.delete("opportunity");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    const el = focusReturnRef.current;
    if (el instanceof HTMLElement) {
      if (focusTimerRef.current !== null) { clearTimeout(focusTimerRef.current); }
      focusTimerRef.current = setTimeout(() => {
        focusTimerRef.current = null;
        if (el.isConnected) { el.focus(); }
      }, FOCUS_RESTORE_DELAY_MS);
    }
  }, [router, pathname, searchParams]);

  const handleOpenTicket = useCallback(() => {
    if (!item?.epicTicketId || !item.projectId) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("ticket", String(item.epicTicketId));
    next.set("ticketProject", String(item.projectId));
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [router, pathname, searchParams, item]);

  const handleOpenOpportunity = useCallback(() => {
    if (!item?.opportunityId) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("opportunity", String(item.opportunityId));
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [router, pathname, searchParams, item]);

  const handleCloseOpportunity = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("opportunity");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  const ticketOriginHref = useMemo(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("ticket"); next.delete("ticketProject");
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const riceItems = useMemo(() => [
    { label: "Reach", value: item?.reach ?? null },
    { label: "Impact", value: item?.impact ?? null },
    { label: "Confidence", value: item?.confidence != null ? `${item.confidence}%` : null },
    { label: "Effort", value: item?.effort ?? null },
  ], [item]);

  const hasRice = item != null && (item.reach != null || item.impact != null || item.confidence != null || item.effort != null);

  return (
    <>
      <Sheet open={itemId !== null} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md max-sm:inset-0 max-sm:max-w-none max-sm:rounded-none">
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
                  {item.horizon ? <Badge variant="outline">{ROADMAP_HORIZON_LABEL[item.horizon]}</Badge> : null}
                  {item.isPublic ? <Badge variant="secondary">Public</Badge> : null}
                  {item.sourceFreshness ? (
                    <Badge variant="outline" className="text-muted-foreground">
                      Source synced {new Date(item.sourceFreshness).toLocaleDateString()}
                    </Badge>
                  ) : null}
                </div>
                {item.description ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</p>
                    <p className="text-sm text-foreground">{item.description}</p>
                  </div>
                ) : null}
                {item.outcome ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Outcome</p>
                    <p className="text-sm text-foreground">{item.outcome}</p>
                  </div>
                ) : null}
                {hasRice ? (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">RICE</p>
                    <div className="grid grid-cols-4 gap-2">
                      {riceItems.map(({ label, value }) => (
                        <div key={label} className="flex flex-col items-center gap-0.5 rounded-lg border border-border p-2">
                          <span className="font-mono text-sm font-semibold tabular-nums">{value ?? "—"}</span>
                          <span className="text-micro text-muted-foreground">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {item.owner ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Owner</p>
                    <p className="text-sm">{getUserDisplayName(item.owner)}</p>
                  </div>
                ) : null}
                {item.goal ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Goal</p>
                    <p className="text-sm">{item.goal.title}</p>
                  </div>
                ) : null}
                {item.release ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Release</p>
                    <p className="text-sm">{item.release.name}</p>
                  </div>
                ) : null}
                {item.team ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Team</p>
                    <p className="text-sm">{item.team.name}</p>
                  </div>
                ) : null}
                {item.targetQuarter ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Target</p>
                    <p className="text-sm">{item.targetQuarter}</p>
                  </div>
                ) : null}
                {item.votes > 0 ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Votes</p>
                    <p className="font-mono text-sm tabular-nums">{item.votes}</p>
                  </div>
                ) : null}
                {item.opportunity ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Opportunity</p>
                    <Button type="button" variant="link" className="h-auto p-0 text-left text-sm" onClick={handleOpenOpportunity}>
                      {item.opportunity.title}
                    </Button>
                  </div>
                ) : null}
                {item.epicTicketId != null && item.projectId != null ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Linked ticket</p>
                    <Button type="button" variant="link" className="h-auto p-0 text-left text-sm" onClick={handleOpenTicket}>
                      View epic ticket
                    </Button>
                  </div>
                ) : null}
              </>
            ) : null}
          </SheetBody>
        </SheetContent>
      </Sheet>
      {ticketId !== null && ticketProjectId !== null ? (
        <TicketDetailPane ticketId={ticketId} projectId={ticketProjectId} originHref={ticketOriginHref} />
      ) : null}
      {opportunityId !== null && item?.managedProductId != null ? (
        <OpportunityPane managedProductId={item.managedProductId} opportunityId={opportunityId} onClose={handleCloseOpportunity} />
      ) : null}
    </>
  );
}
