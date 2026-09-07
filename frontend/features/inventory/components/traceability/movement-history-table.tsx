"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import type { LotMovement } from "@/hooks/api/inventory/traceability";

interface MovementHistoryTableProps {
  movements: LotMovement[];
}

function formatQty(quantityChange: string): string {
  const n = parseFloat(quantityChange);
  return `${n >= 0 ? "+" : ""}${quantityChange}`;
}

const columns: DataTableColumn<LotMovement>[] = [
  {
    key: "date",
    header: "Date",
    className: "text-muted-foreground tabular-nums",
    cell: (row) => new Date(row.createdAt).toLocaleString(),
  },
  {
    key: "transactionType",
    header: "Type",
    className: "font-medium text-foreground",
    cell: (row) => row.transactionType,
  },
  {
    key: "quantityChange",
    header: "Qty",
    className: "text-right font-mono tabular-nums font-semibold",
    headerClassName: "text-right",
    cell: (row) => (
      <span className={parseFloat(row.quantityChange) >= 0 ? "text-status-success-ink" : "text-status-danger-ink"}>
        {formatQty(row.quantityChange)}
      </span>
    ),
  },
];

const emptyState = (
  <InventoryEmptyState
    compact
    title="No movements recorded"
    description="Movement history will appear here once transactions occur."
  />
);

export function MovementHistoryTable({ movements }: MovementHistoryTableProps) {
  return (
    <DataTable
      data={movements}
      columns={columns}
      getRowKey={(row) => row.id}
      emptyState={emptyState}
    />
  );
}
