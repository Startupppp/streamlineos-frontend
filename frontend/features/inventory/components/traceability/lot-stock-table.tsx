"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { formatQuantity } from "@/features/inventory/components/planning/forecast-format";
import type { LotStockByLocation } from "@/hooks/api/inventory/traceability-schema";
import {
  totalStockByLocation,
  type LocationStockTotal,
} from "./traceability-format";

interface LotStockTableProps {
  stockByLocation: LotStockByLocation[];
}

const columns: DataTableColumn<LocationStockTotal>[] = [
  {
    key: "location",
    header: "Location",
    cell: (row) => (
      <>
        <TruncatedText text={row.locationName} className="font-medium text-foreground" />
        <span className="text-muted-foreground font-mono text-micro">{row.locationCode}</span>
      </>
    ),
  },
  {
    key: "warehouse",
    header: "Warehouse",
    cell: (row) => <TruncatedText text={row.warehouseName} className="text-muted-foreground" />,
  },
  {
    key: "onHand",
    header: "On Hand",
    className: "text-right font-mono tabular-nums font-semibold text-foreground",
    headerClassName: "text-right",
    cell: (row) => formatQuantity(row.onHand),
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
      data={totalStockByLocation(stockByLocation)}
      columns={columns}
      getRowKey={(row) => row.locationId}
      emptyState={emptyState}
    />
  );
}
