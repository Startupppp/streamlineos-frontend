"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import type { LotStockByLocation } from "@/hooks/api/inventory/traceability";

interface LotStockTableProps {
  stockByLocation: LotStockByLocation[];
}

const columns: DataTableColumn<LotStockByLocation>[] = [
  {
    key: "location",
    header: "Location",
    cell: (row) => <span className="font-medium text-foreground">{row.locationName}</span>,
  },
  {
    key: "warehouse",
    header: "Warehouse",
    cell: (row) => <span className="text-muted-foreground">{row.warehouseName}</span>,
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
