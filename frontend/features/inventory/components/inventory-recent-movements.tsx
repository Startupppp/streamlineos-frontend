"use client";

import { Badge } from "@/components/ui/badge";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ErrorState } from "@/components/shared";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useStockTransactions, type TransactionType, type StockTransaction } from "@/hooks/api/inventory/stock";

const MOVEMENT_TYPE_CONFIG: Record<TransactionType, { label: string; className: string }> = {
  PURCHASE: { label: "Purchase", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  SALE: { label: "Sale", className: "bg-red-50 text-red-700 border-red-200" },
  ADJUSTMENT_IN: { label: "Adj In", className: "bg-blue-50 text-blue-700 border-blue-200" },
  ADJUSTMENT_OUT: { label: "Adj Out", className: "bg-amber-50 text-amber-700 border-amber-200" },
  TRANSFER_IN: { label: "Transfer In", className: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  TRANSFER_OUT: { label: "Transfer Out", className: "bg-blue-50 text-blue-700 border-blue-200" },
  RETURN_IN: { label: "Return In", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  RETURN_OUT: { label: "Return Out", className: "bg-amber-50 text-amber-700 border-amber-200" },
  GRN: { label: "GRN", className: "bg-blue-50 text-blue-700 border-blue-200" },
};

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function renderDateCell(row: StockTransaction) {
  return formatDateTime(row.createdAt);
}

function renderProductCell(row: StockTransaction) {
  return (
    <>
      <p className="text-[11px] font-medium text-foreground truncate max-w-[160px]">
        {row.productVariant?.product?.name ?? row.productVariant?.name ?? "—"}
      </p>
      <p className="text-[11px] text-muted-foreground font-mono truncate">
        {row.productVariant?.sku ?? "—"}
      </p>
    </>
  );
}

function renderTypeCell(row: StockTransaction) {
  const config = MOVEMENT_TYPE_CONFIG[row.transactionType];
  return (
    <Badge variant="outline" className={`h-4 text-[9px] px-1.5 py-0 font-medium ${config.className}`}>
      {config.label}
    </Badge>
  );
}

function renderQtyCell(row: StockTransaction) {
  const absQty = Math.abs(row.quantityChange);
  const isPositive = row.quantityChange >= 0;
  return (
    <span
      className={`text-[11px] font-mono tabular-nums font-semibold ${
        isPositive ? "text-emerald-600" : "text-red-600"
      }`}
    >
      {isPositive ? `+${absQty}` : `-${absQty}`}
    </span>
  );
}

function renderLocationCell(row: StockTransaction) {
  return (
    <p className="text-[11px] text-foreground truncate max-w-[120px]">
      {row.location?.name ?? "—"}
    </p>
  );
}

function renderUserCell(row: StockTransaction) {
  return (
    <span className="text-[11px] text-muted-foreground truncate max-w-[100px] block">
      {row.creator?.name ?? "System"}
    </span>
  );
}

const MOVEMENTS_COLUMNS: DataTableColumn<StockTransaction>[] = [
  {
    key: "date",
    header: "Date",
    className: "text-muted-foreground whitespace-nowrap",
    cell: renderDateCell,
  },
  {
    key: "product",
    header: "Product",
    className: "min-w-0",
    cell: renderProductCell,
  },
  {
    key: "type",
    header: "Type",
    cell: renderTypeCell,
  },
  {
    key: "qty",
    header: "Qty",
    headerClassName: "text-right",
    className: "text-right",
    cell: renderQtyCell,
  },
  {
    key: "location",
    header: "Location",
    cell: renderLocationCell,
  },
  {
    key: "user",
    header: "User",
    cell: renderUserCell,
  },
];

const MOVEMENTS_EMPTY = (
  <InventoryEmptyState
    compact
    title="No movements yet"
    description="Stock transactions will appear here as items move in and out."
  />
);

export function RecentMovementsTable() {
  const { data, isLoading, error, refetch } = useStockTransactions({ limit: 10 });
  const movements = data?.items ?? [];

  function handleRetry(): void {
    void refetch();
  }

  if (error) {
    return (
      <ErrorState
        compact
        title="Failed to load movements"
        description="Could not retrieve recent stock transactions."
        onRetry={handleRetry}
      />
    );
  }

  return (
    <DataTable
      data={movements}
      columns={MOVEMENTS_COLUMNS}
      getRowKey={(row) => row.id}
      isLoading={isLoading}
      emptyState={MOVEMENTS_EMPTY}
    />
  );
}
