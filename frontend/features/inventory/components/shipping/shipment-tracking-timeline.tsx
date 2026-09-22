"use client";

import { useState } from "react";
import { Package, Truck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatRelativeTime, formatShortDate } from "@/lib/date-utils";
import { useCanState } from "@/hooks/api/access";
import {
  useRefreshShipmentTracking,
  useShipmentTimeline,
} from "@/hooks/api/inventory/shipping";
import {
  SHIPMENT_STATUS_BADGE,
  SHIPMENT_STATUS_LABEL,
} from "@/features/inventory/lib";
import { CarrierStatusDialog } from "./carrier-status-dialog";

interface ShipmentTrackingTimelineProps {
  shipmentId: number;
  trackingNumber: string | null | undefined;
}

/**
 * B7, item 4 — the journey a parcel has actually been reported to have taken.
 *
 * This surface used to say "carrier integrations coming soon", which was wrong
 * in both directions: it promised something nobody was building, and it hid a
 * contract that has been live all along. Tracking events are deduplicated by the
 * carrier's own event id, refuse to move a shipment backwards, and are recorded
 * even when they are declined — so the record is complete whether the events
 * arrive from an integration or from somebody at a desk reading a courier's
 * website.
 */
export function ShipmentTrackingTimeline({
  shipmentId,
  trackingNumber,
}: ShipmentTrackingTimelineProps) {
  const trackingState = useCanState("inventory:shipments:manage");
  const canManage = trackingState === "granted";
  const timelineQuery = useShipmentTimeline(shipmentId);
  const refresh = useRefreshShipmentTracking();
  const [recordOpen, setRecordOpen] = useState<boolean>(false);

  function handleRetry(): void {
    void timelineQuery.refetch();
  }

  function handleOpenRecord(): void {
    setRecordOpen(true);
  }

  function handleRefresh(): void {
    refresh.mutate(shipmentId, {
      onSuccess: (result) => {
        // Three different answers, said differently. Reporting "up to date" when
        // there was nobody to ask is how a warehouse comes to believe a courier
        // is being polled.
        if (!result.polled) {
          toast.info("This carrier is tracked manually — record updates by hand.");
        } else if (result.deadLettered) {
          toast.error("The carrier did not answer. Nothing about this shipment changed.");
        } else {
          toast.success(
            result.recorded > 0
              ? `${result.recorded} new tracking ${result.recorded === 1 ? "update" : "updates"}`
              : "No new tracking updates",
          );
        }
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  const events = timelineQuery.data?.events ?? [];

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Tracking</p>
        {canManage && trackingNumber ? (
          <div className="flex items-center gap-1.5">
            <LoadingButton
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleRefresh}
              isPending={refresh.isPending}
              loadingText="Checking…"
            >
              Refresh
            </LoadingButton>
            <Button type="button" size="sm" variant="outline" onClick={handleOpenRecord}>
              Record update
            </Button>
          </div>
        ) : null}
      </div>

      {!trackingNumber ? (
        <p className="text-xs text-muted-foreground">
          Add a tracking number above to start a tracking history.
        </p>
      ) : trackingState === "denied" ? (
        <NoPermissionState compact permission="inventory:shipments:manage" />
      ) : timelineQuery.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-36" />
        </div>
      ) : timelineQuery.isError ? (
        <ErrorState
          title="Couldn't load tracking"
          description={getErrorMessage(timelineQuery.error)}
          onRetry={handleRetry}
        />
      ) : events.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No carrier updates yet. Record one as the courier reports it.
        </p>
      ) : (
        <ol className="space-y-2.5">
          {events.map((event, index) => (
            <li key={event.id} className="flex items-start gap-2.5">
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  index === 0
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground",
                )}
                aria-hidden="true"
              >
                {event.status === "DELIVERED" ? (
                  <Package className="h-3 w-3" />
                ) : (
                  <Truck className="h-3 w-3" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-4 px-1.5 py-0 text-micro border",
                      SHIPMENT_STATUS_BADGE[event.status],
                    )}
                  >
                    {SHIPMENT_STATUS_LABEL[event.status]}
                  </Badge>
                  {/* The exact instant beside the readable one: a tracking
                      history has to be able to answer "when exactly". */}
                  <time
                    dateTime={event.occurredAt}
                    title={formatShortDate(event.occurredAt)}
                    className="font-mono text-dense text-muted-foreground tabular-nums"
                  >
                    {formatRelativeTime(event.occurredAt)}
                  </time>
                </div>
                {event.description ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{event.description}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}

      {trackingNumber ? (
        <CarrierStatusDialog
          open={recordOpen}
          onOpenChange={setRecordOpen}
          shipmentId={shipmentId}
          trackingNumber={trackingNumber}
        />
      ) : null}
    </div>
  );
}
