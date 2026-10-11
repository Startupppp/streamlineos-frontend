"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { ManagedProductSummary } from "@/hooks/api/build/managed-product-summary";
import { OverviewRecordLink, OverviewSectionLink } from "./overview-metric";

interface DeliveryCardProps {
  managedProductId: number;
  delivery: ManagedProductSummary["delivery"];
  previews: ManagedProductSummary["previews"];
}

function ticketProgressLabel(done: number, total: number): string {
  if (total === 0) return "No linked work";
  return `${done}/${total} (${Math.round((done / total) * 100)}%)`;
}

const HORIZONS = [
  { key: "now", label: "Now" },
  { key: "next", label: "Next" },
  { key: "later", label: "Later" },
  { key: "completed", label: "Completed" },
] as const;

export function ManagedProductOverviewDeliveryCard({
  managedProductId,
  delivery,
  previews,
}: DeliveryCardProps) {
  const nowNextItems = previews.roadmap.filter(
    (item) => item.horizon === "now" || item.horizon === "next",
  );
  const ticketPct =
    delivery.ticketTotals.total === 0
      ? 0
      : Math.round((delivery.ticketTotals.done / delivery.ticketTotals.total) * 100);
  const counts = {
    now: delivery.roadmapByHorizon.now,
    next: delivery.roadmapByHorizon.next,
    later: delivery.roadmapByHorizon.later,
    completed: delivery.roadmapCompleted,
  };

  return (
    <section className="min-w-0 rounded-xl border border-border bg-card px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Delivery progress</h2>
        <OverviewSectionLink href={`/build/managed-products/${managedProductId}/roadmap`}>
          View roadmap
        </OverviewSectionLink>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        {HORIZONS.map((horizon) => (
          <div key={horizon.key} className="bg-card px-3 py-3">
            <p className="text-xs text-muted-foreground">{horizon.label}</p>
            <p className="mt-1 font-mono text-base tabular-nums text-foreground">{counts[horizon.key]}</p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-muted-foreground">Ticket progress</p>
          <p className="font-mono text-sm tabular-nums text-foreground">
            {ticketProgressLabel(delivery.ticketTotals.done, delivery.ticketTotals.total)}
          </p>
        </div>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
          role="meter"
          aria-label="Ticket progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={ticketPct}
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${ticketPct}%` }} />
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted-foreground">Linked projects</p>
        <Link
          href={`/build/managed-products/${managedProductId}/projects`}
          className="inline-flex min-h-11 items-center font-mono text-sm tabular-nums text-primary underline-offset-2 hover:underline"
        >
          {delivery.linkedProjects}
        </Link>
      </div>

      {delivery.nextRelease ? (
        <div className="flex items-baseline justify-between gap-3 border-t border-border/80 pt-3">
          <p className="text-sm text-muted-foreground">Next release</p>
          <p className="text-right text-sm text-foreground">
            {delivery.nextRelease.name} {delivery.nextRelease.version}
          </p>
        </div>
      ) : null}

      {nowNextItems.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground">Now / Next items</p>
          <div className="mt-1">
            {nowNextItems.map((item) => (
              <OverviewRecordLink
                key={item.id}
                href={`/build/managed-products/${managedProductId}/roadmap?horizon=${encodeURIComponent(item.horizon)}`}
                title={item.title}
                trailing={
                  <Badge variant="outline" className="h-5 px-2 py-0.5 text-xs">
                    {item.status.replaceAll("_", " ")}
                  </Badge>
                }
              />
            ))}
          </div>
        </div>
      ) : null}

      {previews.releases.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground">Upcoming releases</p>
          <div className="mt-1">
            {previews.releases.map((release) => (
              <div
                key={release.id}
                className="flex min-h-11 items-center justify-between gap-3 border-b border-border/80 py-2 text-sm last:border-b-0"
              >
                <span className="truncate">{release.name}</span>
                <span className="shrink-0 font-mono tabular-nums text-muted-foreground">{release.version}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
