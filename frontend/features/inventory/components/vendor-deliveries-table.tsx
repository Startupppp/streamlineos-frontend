"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatMoney } from "@/lib/format-utils";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { statusToneClasses } from "@/lib/design-tokens";
import { formatShortDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import type { VendorDelivery } from "@/types/inventory-vendor-performance";

interface VendorDeliveriesTableProps {
  vendorId: number;
  items: VendorDelivery[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  error: unknown;
  onPageChange: (page: number) => void;
  onRetry: () => void;
}

const NOT_APPLICABLE = "—";

/**
 * C4. The drill-through: the purchase orders and receipts each rate on the
 * scorecard above was computed from.
 *
 * A rate nobody can walk back to its documents is a number to argue with rather
 * than act on. A purchase order whose only receipt was cancelled shows no
 * receipt here, which is exactly how the scorecard counted it.
 */
export const VendorDeliveriesTable = memo(function VendorDeliveriesTable({
  vendorId,
  items,
  total,
  page,
  pageSize,
  isLoading,
  error,
  onPageChange,
  onRetry,
}: VendorDeliveriesTableProps) {
  const display = useOrgDisplay();

  const columns: DataTableColumn<VendorDelivery>[] = useMemo(
    () => [
      {
        key: "poNumber",
        header: "PO #",
        cell: (row) => (
          <Link
            href={`/inventory/purchase-orders/${row.poId}`}
            className="font-mono text-primary transition-colors hover:underline"
          >
            {row.poNumber}
          </Link>
        ),
      },
      {
        key: "orderDate",
        header: "Ordered",
        className: "font-mono tabular-nums",
        cell: (row) => <span>{formatShortDate(row.orderDate)}</span>,
      },
      {
        key: "expectedDeliveryDate",
        header: "Promised",
        className: "font-mono tabular-nums",
        cell: (row) => (
          <span>{row.expectedDeliveryDate ? formatShortDate(row.expectedDeliveryDate) : NOT_APPLICABLE}</span>
        ),
      },
      {
        key: "firstReceiptDate",
        header: "Received",
        className: "font-mono tabular-nums",
        cell: (row) => (
          <span>{row.firstReceiptDate ? formatShortDate(row.firstReceiptDate) : NOT_APPLICABLE}</span>
        ),
      },
      {
        key: "onTime",
        header: "On time",
        cell: (row) => {
          if (row.onTime === null)
            return <span className="text-muted-foreground">{NOT_APPLICABLE}</span>;
          const tone = statusToneClasses(row.onTime ? "success" : "danger");
          return (
            <Badge
              variant="outline"
              className={cn("h-4 px-1.5 py-0 text-micro", tone.surface, tone.ink, tone.rule)}
            >
              {row.onTime ? "On time" : "Late"}
            </Badge>
          );
        },
      },
      {
        key: "daysToReceive",
        header: "Days",
        headerClassName: "text-right",
        className: "text-right font-mono tabular-nums",
        cell: (row) => <span>{row.daysToReceive ?? NOT_APPLICABLE}</span>,
      },
      {
        key: "fill",
        header: "Lines filled",
        headerClassName: "text-right",
        className: "text-right font-mono tabular-nums",
        cell: (row) => (
          <span>
            {row.linesInFull}/{row.lines}
          </span>
        ),
      },
      {
        key: "quantity",
        header: "Units received",
        headerClassName: "text-right",
        className: "text-right font-mono tabular-nums",
        cell: (row) => (
          <span>
            {row.receivedQty}/{row.orderedQty}
          </span>
        ),
      },
      {
        key: "receiptCount",
        header: "Receipts",
        headerClassName: "text-right",
        className: "text-right font-mono tabular-nums",
        cell: (row) => <span>{row.receiptCount}</span>,
      },
      {
        key: "total",
        header: "Value",
        headerClassName: "text-right",
        className: "text-right font-mono tabular-nums",
        cell: (row) => <span>{formatMoney(row.total, { ...display, currency: row.currency })}</span>,
      },
    ],
    [display],
  );

  if (error)
    return (
      <ErrorState
        title="Couldn't load this vendor's deliveries"
        description={getErrorMessage(error)}
        onRetry={onRetry}
        compact
      />
    );

  return (
    <DataTable
      data={items}
      columns={columns}
      getRowKey={(row) => row.poId}
      isLoading={isLoading}
      minWidth="1040px"
      pagination={{ mode: "server", page, pageSize, total, onPageChange }}
      emptyState={
        <InventoryEmptyState
          illustrationPreset="inventory"
          title="No deliveries yet"
          description="Every rate above is unmeasured until this vendor has shipped against a purchase order."
          action={{
            label: "New PO",
            href: `/inventory/purchase-orders/new?vendorId=${vendorId}`,
          }}
          compact
        />
      }
    />
  );
});
