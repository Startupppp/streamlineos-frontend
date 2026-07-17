"use client";

import { TruncatedText } from "@/components/ui/truncated-text";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import type { LotMovement } from "@/hooks/api/inventory/traceability";

interface MovementHistoryTableProps {
  movements: LotMovement[];
}

function formatQty(qty: number): string {
  return `${qty >= 0 ? "+" : ""}${qty}`;
}

const columns: DataTableColumn<LotMovement>[] = [
  {
    key: "date",
    header: "Date",
    className: "text-muted-foreground tabular-nums",
    cell: (row) => new Date(row.createdAt).toLocaleString(),
  },
  {
    key: "type",
    header: "Type",
    className: "font-medium text-foreground",
    cell: (row) => row.type,
  },
  {
    key: "qty",
    header: "Qty",
    className: "text-right font-mono tabular-nums font-semibold",
    headerClassName: "text-right",
    cell: (row) => (
      <span className={row.qty >= 0 ? "text-emerald-600" : "text-red-600"}>
        {formatQty(row.qty)}
      </span>
    ),
  },
  {
    key: "reference",
    header: "Reference",
    className: "hidden md:table-cell text-muted-foreground",
    headerClassName: "hidden md:table-cell",
    cell: (row) =>
      row.referenceType && row.referenceId
        ? `${row.referenceType} #${row.referenceId}`
        : "—",
  },
  {
    key: "notes",
    header: "Notes",
    className: "hidden lg:table-cell text-muted-foreground",
    headerClassName: "hidden lg:table-cell",
    cell: (row) => <TruncatedText text={row.notes ?? "—"} className="max-w-[200px]" />,
  },
  {
    key: "by",
    header: "By",
    className: "hidden md:table-cell text-muted-foreground",
    headerClassName: "hidden md:table-cell",
    cell: (row) => <TruncatedText text={row.performedBy ?? "—"} className="text-muted-foreground" />,
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
