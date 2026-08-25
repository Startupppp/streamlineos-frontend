"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { AppSheet } from "@/components/shared/app-sheet";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useStockAvailability } from "@/hooks/api/inventory/stock";
import { cn } from "@/lib/utils";
import type { StockAvailabilityByWarehouse } from "@/types/inventory";

interface AvailabilityPopoverProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  variantId: number | null;
  variantName?: string;
}

function MetricRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-xs font-mono tabular-nums", highlight && "font-semibold text-foreground")}>
        {Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 })}
      </span>
    </div>
  );
}

const WAREHOUSE_COLUMNS: DataTableColumn<StockAvailabilityByWarehouse>[] = [
  {
    key: "warehouse",
    header: "Warehouse",
    cell: (row) => <span className="font-medium">{row.warehouse_name}</span>,
  },
  {
    key: "onHand",
    header: "On Hand",
    headerClassName: "text-right",
    className: "text-right text-muted-foreground",
    cell: (row) => Number(row.on_hand).toLocaleString(undefined, { maximumFractionDigits: 4 }),
  },
  {
    key: "committed",
    header: "Committed",
    headerClassName: "text-right",
    className: "text-right text-muted-foreground",
    cell: (row) => Number(row.committed).toLocaleString(undefined, { maximumFractionDigits: 4 }),
  },
  {
    key: "available",
    header: "Available",
    headerClassName: "text-right",
    className: "text-right font-semibold text-status-success-ink",
    cell: (row) => Number(row.available).toLocaleString(undefined, { maximumFractionDigits: 4 }),
  },
];

export function AvailabilityPopover({ open, onOpenChange, variantId, variantName }: AvailabilityPopoverProps) {
  const { data, isLoading } = useStockAvailability(variantId ?? 0);

  const title = variantName ? `Availability — ${variantName}` : "Stock Availability";

  return (
    <AppSheet open={open} onOpenChange={onOpenChange} title={title} className="sm:max-w-md">
      {isLoading ? (
        <div className="p-6 space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : !data ? (
        <div className="p-6 text-sm text-muted-foreground">No availability data found.</div>
      ) : (
        <div className="p-6 space-y-5">
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-0">
            <MetricRow label="On Hand" value={data.onHand} />
            <MetricRow label="Committed" value={data.committed} />
            <MetricRow label="Incoming (Open POs)" value={data.incoming} />
            <MetricRow label="Outgoing (Open SOs)" value={data.outgoing} />
            <MetricRow label="Available (ATP)" value={data.available} highlight />
            <MetricRow label="Forecasted" value={data.forecasted} />
          </div>

          {data.warehouseBreakdown.length > 0 && (
            <div>
              <p className="text-dense font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                By Warehouse
              </p>
              <DataTable
                data={data.warehouseBreakdown}
                columns={WAREHOUSE_COLUMNS}
                getRowKey={(row) => row.warehouse_id}
                className="border-0"
              />
            </div>
          )}

          {data.warehouseBreakdown.length === 0 && (
            <p className="text-xs text-muted-foreground">No warehouse breakdown available.</p>
          )}
        </div>
      )}
    </AppSheet>
  );
}
