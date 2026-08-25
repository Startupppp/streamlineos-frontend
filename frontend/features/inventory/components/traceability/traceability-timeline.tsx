"use client";

import { memo, type ReactNode } from "react";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  TraceabilityResult,
  TraceabilityEvent,
  LotStockByLocation,
} from "@/hooks/api/inventory/traceability";

interface TraceabilityTimelineProps {
  result: TraceabilityResult | undefined;
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

const EventRow = memo(function EventRow({
  event,
}: {
  event: TraceabilityEvent;
}) {
  return (
    <div className="flex items-start justify-between gap-2 text-dense py-0.5">
      <div className="min-w-0 flex-1">
        <span className="font-medium text-foreground">{event.eventType}</span>
        {event.referenceType && event.referenceId && (
          <span className="text-muted-foreground ml-1.5">
            {event.referenceType} #{event.referenceId}
          </span>
        )}
        {event.notes && (
          <TruncatedText text={event.notes} className="text-muted-foreground mt-0.5" />
        )}
      </div>
      <div className="text-right shrink-0 text-muted-foreground tabular-nums">
        <p>{new Date(event.date).toLocaleDateString()}</p>
        <p
          className={`font-semibold ${event.qty >= 0 ? "text-emerald-600" : "text-red-600"}`}
        >
          {event.qty >= 0 ? "+" : ""}
          {event.qty}
        </p>
      </div>
    </div>
  );
});

const StockRow = memo(function StockRow({ loc }: { loc: LotStockByLocation }) {
  return (
    <div className="flex items-center justify-between text-dense py-0.5">
      <div>
        <span className="font-medium text-foreground">{loc.locationName}</span>
        <span className="text-muted-foreground ml-1.5">
          {loc.warehouseName}
        </span>
      </div>
      <span className="font-mono tabular-nums font-semibold text-foreground">
        {loc.qty.toLocaleString()}
      </span>
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

  return (
    <div className="space-y-0 pl-1">
      <TimelineSection dotClass="bg-primary" label="Origin">
        {result.origin ? (
          <div className="text-dense">
            <span className="font-medium text-foreground">
              {result.origin.vendorName ?? "Unknown vendor"}
            </span>
            {result.origin.receiptDate && (
              <span className="text-muted-foreground ml-1.5">
                {new Date(result.origin.receiptDate).toLocaleDateString()}
              </span>
            )}
            {result.origin.receiptId && (
              <span className="text-muted-foreground ml-1.5">
                Receipt #{result.origin.receiptId}
              </span>
            )}
          </div>
        ) : (
          <p className="text-dense text-muted-foreground">No origin data</p>
        )}
      </TimelineSection>

      {result.receipts.length > 0 && (
        <TimelineSection dotClass="bg-emerald-500" label="Receipts">
          <div className="space-y-0.5">
            {result.receipts.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        </TimelineSection>
      )}

      <TimelineSection dotClass="bg-muted-foreground/40" label="Current Stock">
        {result.currentStock.length > 0 ? (
          <div className="space-y-0.5">
            {result.currentStock.map((loc) => (
              <StockRow key={loc.locationId} loc={loc} />
            ))}
          </div>
        ) : (
          <p className="text-dense text-muted-foreground">No stock on hand</p>
        )}
      </TimelineSection>

      {result.shipments.length > 0 && (
        <TimelineSection dotClass="bg-amber-500" label="Shipments">
          <div className="space-y-0.5">
            {result.shipments.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        </TimelineSection>
      )}

      {(result.vendorReturns.length > 0 ||
        result.customerReturns.length > 0) && (
        <TimelineSection dotClass="bg-orange-400" label="Returns">
          <div className="space-y-0.5">
            {[...result.vendorReturns, ...result.customerReturns].map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        </TimelineSection>
      )}

      {result.events.length > 0 && (
        <TimelineSection dotClass="bg-primary/60" label="Other Events">
          <div className="space-y-0.5">
            {result.events.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        </TimelineSection>
      )}
    </div>
  );
}
