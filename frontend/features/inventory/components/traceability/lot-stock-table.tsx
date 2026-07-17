"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import type { LotStockByLocation } from "@/hooks/api/inventory/traceability";

interface LotStockTableProps {
  stockByLocation: LotStockByLocation[];
}

const columns: DataTableColumn<LotStockByLocation>[] = [
  {
    key: "location",
    header: "Location",
    cell: (row) => <TruncatedText text={row.locationName} className="font-medium text-foreground" />,
  },
  {
    key: "warehouse",
    header: "Warehouse",
    cell: (row) => <TruncatedText text={row.warehouseName} className="text-muted-foreground" />,
  },
  {
    key: "qty",
    header: "Qty",
    className: "text-right font-mono tabular-nums font-semibold text-foreground",
    headerClassName: "text-right",
    cell: (row) => row.qty.toLocaleString(),
  },
];

const emptyState = (
  <InventoryEmptyState
    compact
    title="No stock on hand"
    description="This lot has no stock currently allocated to any location."
  />
);

export function LotStockTable({ stockByLocation }: LotStockTableProps) {
  return (
    <DataTable
      data={stockByLocation}
      columns={columns}
      getRowKey={(row) => row.locationId}
      emptyState={emptyState}
    />
  );
}
