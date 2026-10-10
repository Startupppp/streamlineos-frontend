"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ManagedProductSummary } from "@/hooks/api/build/managed-product-summary";

interface DeliveryCardProps {
  managedProductId: number;
  delivery: ManagedProductSummary["delivery"];
  previews: ManagedProductSummary["previews"];
}

function ticketProgressLabel(done: number, total: number): string {
  if (total === 0) return "No linked work";
  return `${done}/${total} (${Math.round((done / total) * 100)}%)`;
}

export function ManagedProductOverviewDeliveryCard({
  managedProductId,
  delivery,
  previews,
}: DeliveryCardProps) {
  const nowNextItems = previews.roadmap.filter(
    (item) => item.horizon === "now" || item.horizon === "next",
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Delivery progress</h2>
          <Link
            href={`/build/managed-products/${managedProductId}/roadmap`}
            className="text-xs text-primary underline-offset-2 hover:underline"
          >
            View roadmap
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Now</span>
            <p className="font-mono text-lg font-semibold tabular-nums">
              {delivery.roadmapByHorizon.now}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Next</span>
            <p className="font-mono text-lg font-semibold tabular-nums">
              {delivery.roadmapByHorizon.next}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Later</span>
            <p className="font-mono text-lg font-semibold tabular-nums">
              {delivery.roadmapByHorizon.later}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Completed</span>
            <p className="font-mono text-lg font-semibold tabular-nums">{delivery.roadmapCompleted}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Ticket progress</span>
            <p className="font-mono tabular-nums">
              {ticketProgressLabel(delivery.ticketTotals.done, delivery.ticketTotals.total)}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Linked projects</span>
            <Link
              href={`/build/managed-products/${managedProductId}/projects`}
              className="block font-mono tabular-nums text-primary underline-offset-2 hover:underline"
            >
              {delivery.linkedProjects}
            </Link>
          </div>
          {delivery.nextRelease ? (
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground">Next release</span>
              <p className="text-sm">{delivery.nextRelease.name} {delivery.nextRelease.version}</p>
            </div>
          ) : null}
        </div>

        {nowNextItems.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Now / Next items</span>
            <div className="space-y-1">
              {nowNextItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/build/managed-products/${managedProductId}/roadmap?horizon=${encodeURIComponent(item.horizon)}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm hover:border-primary/40"
                >
                  <span className="truncate">{item.title}</span>
                  <Badge variant="outline" className="h-5 shrink-0 px-2 py-0.5 text-xs">
                    {item.status}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

        {previews.releases.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Upcoming releases</span>
            <div className="space-y-1">
              {previews.releases.map((release) => (
                <div
                  key={release.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                >
                  <span className="truncate">{release.name}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {release.version}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
