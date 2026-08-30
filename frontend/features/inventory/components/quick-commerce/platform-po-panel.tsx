"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { AppSheet, ErrorState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyOrdersIllustration } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useAcceptPlatformPo,
  useFillRate,
  usePlatformPurchaseOrder,
  type FillRateLine,
  type PlatformPoLine,
} from "@/hooks/api/inventory/quick-commerce";

interface PlatformPoPanelProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  platformPoId: number | null;
}

function formatQty(value: string): string {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatPaise(value: number | null): string {
  if (value === null) return "\u2014";
  return (value / 100).toLocaleString(undefined, { style: "currency", currency: "INR" });
}

const LINE_COLUMNS: DataTableColumn<PlatformPoLine>[] = [
  {
    key: "item",
    header: "Item",
    cell: (row) => (
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{row.providerSku ?? row.ean ?? "Unnamed"}</p>
        {row.ean && row.providerSku && (
          <p className="text-dense text-muted-foreground">EAN {row.ean}</p>
        )}
      </div>
    ),
  },
  {
    key: "ordered",
    header: "Ordered",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (row) => formatQty(row.quantityOrdered),
  },
  {
    key: "mrp",
    header: "MRP",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums text-muted-foreground",
    cell: (row) => formatPaise(row.mrpPaise),
  },
  {
    key: "match",
    header: "Match",
    // The reason a line failed is the whole value of keeping a rejected
    // document: "no product carries EAN 89012…" is actionable, "rejected" is not.
    cell: (row) =>
      row.validationError ? (
        <span className="text-dense text-status-danger-ink">{row.validationError}</span>
      ) : (
        <Badge
          variant="outline"
          className="text-dense bg-status-success-surface text-status-success-ink border-status-success-rule"
        >
          Variant #{row.productVariantId}
        </Badge>
      ),
  },
];

const FILL_RATE_COLUMNS: DataTableColumn<FillRateLine>[] = [
  {
    key: "item",
    header: "Item",
    cell: (row) => <span className="text-sm">{row.providerSku ?? row.ean ?? "Unnamed"}</span>,
  },
  {
    key: "ordered",
    header: "Ordered",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums text-muted-foreground",
    cell: (row) => formatQty(row.orderedQty),
  },
  {
    key: "accepted",
    header: "Accepted",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (row) => formatQty(row.acceptedQty),
  },
  {
    key: "fill",
    header: "Fill rate",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums font-semibold",
    cell: (row) => `${Number(row.fillRatePct).toFixed(2)}%`,
  },
  {
    key: "payout",
    header: "Payout",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums text-muted-foreground",
    cell: (row) =>
      row.payoutVariance === null
        ? formatPaise(row.payoutAmountPaise)
        : `${formatPaise(row.payoutAmountPaise)} (${formatQty(row.payoutVariance)} off)`,
  },
];

/**
 * NEO-2 / NEO-3 - one platform purchase order: what they asked for, what matched
 * our catalogue, and how we did against it.
 */
export function PlatformPoPanel({ open, onOpenChange, platformPoId }: PlatformPoPanelProps) {
  const canAccept = useCan("inventory:purchase-orders:create");
  const canSeeFillRate = useCan("inventory:reports:read");
  const { data, isLoading, isError, refetch } = usePlatformPurchaseOrder(platformPoId);
  const fillRate = useFillRate(platformPoId);
  const accept = useAcceptPlatformPo();

  const [vendorId, setVendorId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleAccept = useCallback(() => {
    if (!platformPoId) return;
    const vendor = Number(vendorId);
    const warehouse = Number(warehouseId);
    if (!Number.isInteger(vendor) || vendor <= 0) {
      toast.error("Enter the vendor this order will be bought from");
      return;
    }
    if (!Number.isInteger(warehouse) || warehouse <= 0) {
      toast.error("Enter the warehouse that will receive it");
      return;
    }
    accept.mutate(
      { platformPoId, vendorId: vendor, warehouseId: warehouse, orderDate, reserveIntoChannelPool: true },
      {
        onSuccess: () => toast.success("Purchase order raised and stock claimed for the channel"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [accept, orderDate, platformPoId, vendorId, warehouseId]);

  const title = data ? `${data.provider} ${data.providerPoNumber}` : "Platform purchase order";

  return (
    <AppSheet open={open} onOpenChange={onOpenChange} title={title} className="sm:max-w-3xl">
      {isLoading ? (
        <div className="p-6 space-y-2">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : isError || !data ? (
        <div className="p-6">
          <ErrorState
            title="Failed to load this purchase order"
            description="An error occurred while fetching the platform purchase order."
            onRetry={handleRetry}
          />
        </div>
      ) : (
        <div className="p-6 space-y-6">
          <section className="space-y-2">
            <p className="text-dense font-semibold uppercase tracking-wider text-muted-foreground">
              Lines as the platform sent them
            </p>
            {data.lines.length > 0 ? (
              <DataTable
                data={data.lines}
                columns={LINE_COLUMNS}
                getRowKey={(row) => row.id}
                className="border-0"
              />
            ) : (
              <InventoryEmptyState
                illustration={<EmptyOrdersIllustration />}
                title="No lines on this order"
                description="The platform sent a purchase order with nothing on it."
              />
            )}
          </section>

          {data.status === "REJECTED" && (
            <p className="text-xs text-status-danger-ink">
              This order cannot be accepted until every line matches a product in this catalogue.
              The reasons are on the lines above.
            </p>
          )}

          {canAccept && data.status === "RECEIVED" && (
            <section className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <p className="text-dense font-semibold uppercase tracking-wider text-muted-foreground">
                Accept
              </p>
              <p className="text-xs text-muted-foreground">
                Accepting raises a Streamline purchase order for the goods and claims the stock for
                this platform&apos;s channel, so the same units stop being offered elsewhere.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="qc-vendor">Vendor id</Label>
                  <Input
                    id="qc-vendor"
                    inputMode="numeric"
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="qc-warehouse">Warehouse id</Label>
                  <Input
                    id="qc-warehouse"
                    inputMode="numeric"
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="qc-date">Order date</Label>
                  <Input
                    id="qc-date"
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                  />
                </div>
              </div>
              <LoadingButton
                size="sm"
                onClick={handleAccept}
                isPending={accept.isPending}
                loadingText="Accepting…"
              >
                Accept and raise purchase order
              </LoadingButton>
            </section>
          )}

          {canSeeFillRate && (
            <section className="space-y-2">
              <p className="text-dense font-semibold uppercase tracking-wider text-muted-foreground">
                Fill rate
              </p>
              {fillRate.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : fillRate.isError || !fillRate.data ? (
                <p className="text-xs text-muted-foreground">
                  Fill rate is not available for this order yet.
                </p>
              ) : (
                <>
                  <p className="text-sm">
                    <span className="font-mono tabular-nums font-semibold">
                      {Number(fillRate.data.fillRatePct).toFixed(2)}%
                    </span>{" "}
                    <span className="text-muted-foreground">
                      — {formatQty(fillRate.data.acceptedQty)} accepted of{" "}
                      {formatQty(fillRate.data.orderedQty)} ordered
                    </span>
                  </p>
                  <DataTable
                    data={fillRate.data.lines}
                    columns={FILL_RATE_COLUMNS}
                    getRowKey={(row) => row.platformPoLineId}
                    className="border-0"
                  />
                  {fillRate.data.unmatchedPayoutLines.length > 0 && (
                    <div className="rounded-lg border border-status-warning-rule bg-status-warning-surface p-3 space-y-1">
                      <p className="text-dense font-semibold text-status-warning-ink">
                        {fillRate.data.unmatchedPayoutLines.length} payout line(s) could not be matched
                      </p>
                      {fillRate.data.unmatchedPayoutLines.map((line) => (
                        <p key={line.id} className="text-dense text-status-warning-ink">
                          {line.payoutRef} · {line.providerSku ?? line.ean ?? "unnamed item"} ·{" "}
                          {formatQty(line.quantity)} · {formatPaise(line.amountPaise)} —{" "}
                          {line.unmatchedReason}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          )}
        </div>
      )}
    </AppSheet>
  );
}
