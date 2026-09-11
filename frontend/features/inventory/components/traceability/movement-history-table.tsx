"use client";

import { TruncatedText } from "@/components/ui/truncated-text";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { formatSignedQuantity } from "@/features/inventory/components/planning/forecast-format";
import { formatDateTime } from "@/lib/date-utils";
import type { StockMovement } from "@/hooks/api/inventory/traceability-schema";
import { movementTypeLabel } from "./traceability-format";

interface MovementHistoryTableProps {
  movements: StockMovement[];
}

const columns: DataTableColumn<StockMovement>[] = [
  {
    key: "date",
    header: "Date",
    className: "text-muted-foreground tabular-nums",
    cell: (row) => formatDateTime(row.createdAt),
  },
  {
    key: "type",
    header: "Type",
    className: "font-medium text-foreground",
    cell: (row) => movementTypeLabel(row.transactionType),
  },
  {
    key: "qty",
    header: "Qty",
    className: "text-right font-mono tabular-nums font-semibold",
    headerClassName: "text-right",
    cell: (row) => (
      <span
        className={
          Number(row.quantityChange) >= 0
            ? "text-status-success-ink"
            : "text-status-danger-ink"
        }
      >
        {formatSignedQuantity(Number(row.quantityChange))}
      </span>
    ),
  },
  {
    key: "location",
    header: "Location",
    className: "hidden md:table-cell text-muted-foreground",
    headerClassName: "hidden md:table-cell",
    cell: (row) => (
      <TruncatedText text={row.location?.name ?? "—"} className="text-muted-foreground" />
    ),
  },
  {
    key: "notes",
    header: "Notes",
    className: "hidden lg:table-cell text-muted-foreground",
    headerClassName: "hidden lg:table-cell",
    cell: (row) => <TruncatedText text={row.notes ?? "—"} className="max-w-[200px]" />,
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
