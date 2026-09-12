"use client";

import { memo, type ReactNode } from "react";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatQuantity,
  formatSignedQuantity,
} from "@/features/inventory/components/planning/forecast-format";
import { formatCalendarDate, formatDateTime, formatShortDate } from "@/lib/date-utils";
import type { TraceabilityChain } from "@/hooks/api/inventory/traceability-schema";
import {
  movementTypeLabel,
  statusLabel,
  totalReturns,
  totalShipments,
  totalStockByLocation,
  type LocationStockTotal,
  type ReturnTotal,
  type ShipmentTotal,
} from "./traceability-format";

interface TraceabilityTimelineProps {
  result: TraceabilityChain | undefined;
  isLoading: boolean;
}

interface TimelineSectionProps {
  dotClass: string;
  label: string;
  children: ReactNode;
}

function TimelineSection({ dotClass, label, children }: TimelineSectionProps) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`h-3 w-3 rounded-full shrink-0 mt-0.5 ${dotClass}`} />
        <div className="w-px flex-1 bg-border mt-1" />
      </div>
      <div className="pb-5 min-w-0 flex-1">
        <p className="text-dense font-semibold text-foreground uppercase tracking-wider mb-1.5">
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}

const ReceiptRow = memo(function ReceiptRow({
  receipt,
}: {
  receipt: TraceabilityChain["receipts"][number];
}) {
  return (
    <div className="flex items-start justify-between gap-2 text-dense py-0.5">
      <div className="min-w-0 flex-1">
        <span className="font-medium text-foreground">{receipt.grnNumber}</span>
        <span className="text-muted-foreground ml-1.5">{receipt.vendorName}</span>
        <span className="text-muted-foreground ml-1.5">PO {receipt.poNumber}</span>
        {receipt.reversed && (
          <span className="text-status-warning-ink ml-1.5">Reversed</span>
        )}
      </div>
      <div className="text-right shrink-0 text-muted-foreground tabular-nums">
        <p>{formatCalendarDate(receipt.receivedDate)}</p>
        <p className="font-semibold text-status-success-ink">
          {formatSignedQuantity(Number(receipt.qtyReceived))}
        </p>
      </div>
    </div>
  );
});

const StockRow = memo(function StockRow({ location }: { location: LocationStockTotal }) {
  return (
    <div className="flex items-center justify-between text-dense py-0.5">
      <div className="min-w-0">
        <span className="font-medium text-foreground">{location.locationName}</span>
        <span className="text-muted-foreground ml-1.5">{location.warehouseName}</span>
      </div>
      <span className="font-mono tabular-nums font-semibold text-foreground">
        {formatQuantity(location.onHand)}
      </span>
    </div>
  );
});

const ShipmentRow = memo(function ShipmentRow({ shipment }: { shipment: ShipmentTotal }) {
  return (
    <div className="flex items-start justify-between gap-2 text-dense py-0.5">
      <div className="min-w-0 flex-1">
        <span className="font-medium text-foreground">{shipment.shipmentNumber}</span>
        <span className="text-muted-foreground ml-1.5">{statusLabel(shipment.status)}</span>
      </div>
      <div className="text-right shrink-0 text-muted-foreground tabular-nums">
        <p>{shipment.shippedAt ? formatShortDate(shipment.shippedAt) : "Not shipped"}</p>
        <p className="font-semibold text-status-danger-ink">
          {formatQuantity(shipment.quantity)}
        </p>
      </div>
    </div>
  );
});

const ReturnRow = memo(function ReturnRow({ entry }: { entry: ReturnTotal }) {
  return (
    <div className="flex items-start justify-between gap-2 text-dense py-0.5">
      <div className="min-w-0 flex-1">
        <span className="font-medium text-foreground">{entry.returnNumber}</span>
        <span className="text-muted-foreground ml-1.5">{entry.kind}</span>
        <span className="text-muted-foreground ml-1.5">{statusLabel(entry.status)}</span>
      </div>
      <span className="shrink-0 font-semibold text-muted-foreground tabular-nums">
        {formatQuantity(entry.quantity)}
      </span>
    </div>
  );
});

const EventRow = memo(function EventRow({
  event,
}: {
  event: TraceabilityChain["events"][number];
}) {
  return (
    <div className="flex items-start justify-between gap-2 text-dense py-0.5">
      <div className="min-w-0 flex-1">
        <span className="font-medium text-foreground">
          {movementTypeLabel(event.transactionType)}
        </span>
        {event.location && (
          <span className="text-muted-foreground ml-1.5">{event.location.name}</span>
        )}
        {event.creator?.name && (
          <span className="text-muted-foreground ml-1.5">{event.creator.name}</span>
        )}
        {event.reversed && <span className="text-status-warning-ink ml-1.5">Reversed</span>}
        {event.notes && (
          <TruncatedText text={event.notes} className="text-muted-foreground mt-0.5" />
        )}
      </div>
      <div className="text-right shrink-0 text-muted-foreground tabular-nums">
        <p>{formatDateTime(event.createdAt)}</p>
        <p
          className={`font-semibold ${Number(event.quantityChange) >= 0 ? "text-status-success-ink" : "text-status-danger-ink"}`}
        >
          {formatSignedQuantity(Number(event.quantityChange))}
        </p>
      </div>
    </div>
  );
});

export function TraceabilityTimeline({
  result,
  isLoading,
}: TraceabilityTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-3 w-3 rounded-full shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!result) {
    return (
      <p className="text-xs text-muted-foreground">
        No traceability data available.
      </p>
    );
  }

  const stock = totalStockByLocation(result.currentStock);
  const shipments = totalShipments(result.shipments);
  const returns = totalReturns(result.returns);

  return (
    <div className="space-y-0 pl-1">
      <TimelineSection dotClass="bg-primary" label="Origin">
        {result.origin ? (
          <div className="text-dense">
            <span className="font-medium text-foreground">
              {result.origin.productVariant.product.name}
            </span>
            <span className="text-muted-foreground ml-1.5 font-mono">
              {result.origin.productVariant.sku}
            </span>
          </div>
        ) : (
          <p className="text-dense text-muted-foreground">No origin data</p>
        )}
      </TimelineSection>

      {result.receipts.length > 0 && (
        <TimelineSection dotClass="bg-status-success-fill" label="Receipts">
          <div className="space-y-0.5">
            {result.receipts.map((receipt) => (
              <ReceiptRow key={receipt.transactionId} receipt={receipt} />
            ))}
          </div>
        </TimelineSection>
      )}

      <TimelineSection dotClass="bg-muted-foreground/40" label="Current Stock">
        {stock.length > 0 ? (
          <div className="space-y-0.5">
            {stock.map((location) => (
              <StockRow key={location.locationId} location={location} />
            ))}
          </div>
        ) : (
          <p className="text-dense text-muted-foreground">No stock on hand</p>
        )}
      </TimelineSection>

      {shipments.length > 0 && (
        <TimelineSection dotClass="bg-status-warning-fill" label="Shipments">
          <div className="space-y-0.5">
            {shipments.map((shipment) => (
              <ShipmentRow key={shipment.shipmentId} shipment={shipment} />
            ))}
          </div>
        </TimelineSection>
      )}

      {returns.length > 0 && (
        <TimelineSection dotClass="bg-status-warning-fill" label="Returns">
          <div className="space-y-0.5">
            {returns.map((entry) => (
              <ReturnRow key={entry.key} entry={entry} />
            ))}
          </div>
        </TimelineSection>
      )}

      {result.events.length > 0 && (
        <TimelineSection dotClass="bg-primary/60" label="Movements">
          <div className="space-y-0.5">
            {result.events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        </TimelineSection>
      )}
    </div>
  );
}
