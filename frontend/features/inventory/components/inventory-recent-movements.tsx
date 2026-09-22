"use client";

import { Badge } from "@/components/ui/badge";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useStockTransactions, type TransactionType, type StockTransaction } from "@/hooks/api/inventory/stock";
import { useCanState } from "@/hooks/api/access";

const MOVEMENT_TYPE_CONFIG: Record<TransactionType, { label: string; className: string }> = {
  PURCHASE: { label: "Purchase", className: "bg-status-success-surface text-status-success-ink border-status-success-rule" },
  SALE: { label: "Sale", className: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule" },
  ADJUSTMENT_IN: { label: "Adj In", className: "bg-primary/5 text-foreground border-border" },
  ADJUSTMENT_OUT: { label: "Adj Out", className: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule" },
  TRANSFER_IN: { label: "Transfer In", className: "bg-status-info-surface text-status-info-ink border-status-info-rule" },
  TRANSFER_OUT: { label: "Transfer Out", className: "bg-primary/5 text-foreground border-border" },
  RETURN_IN: { label: "Return In", className: "bg-status-success-surface text-status-success-ink border-status-success-rule" },
  RETURN_OUT: { label: "Return Out", className: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule" },
  GRN: { label: "GRN", className: "bg-primary/5 text-foreground border-border" },
  OPENING_BALANCE: { label: "Opening", className: "bg-status-info-surface text-status-info-ink border-status-info-rule" },
  VENDOR_RETURN: { label: "Vendor Rtn", className: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule" },
  CUSTOMER_RETURN: { label: "Cust Rtn", className: "bg-status-success-surface text-status-success-ink border-status-success-rule" },
  CYCLE_COUNT_GAIN: { label: "Count Gain", className: "bg-status-success-surface text-status-success-ink border-status-success-rule" },
  CYCLE_COUNT_LOSS: { label: "Count Loss", className: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule" },
  SCRAP: { label: "Scrap", className: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule" },
  QUARANTINE_IN: { label: "Quar In", className: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule" },
  QUARANTINE_OUT: { label: "Quar Out", className: "bg-primary/5 text-foreground border-border" },
  RESERVATION_CREATE: { label: "Reserved", className: "bg-muted text-muted-foreground border-border" },
  RESERVATION_RELEASE: { label: "Res. Release", className: "bg-muted text-muted-foreground border-border" },
  RESERVATION_CONSUME: { label: "Res. Consume", className: "bg-muted text-muted-foreground border-border" },
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
      <TruncatedText
        text={row.productVariant?.product?.name ?? row.productVariant?.name ?? "—"}
        className="text-dense font-medium text-foreground"
      />
      <TruncatedText
        text={row.productVariant?.sku ?? "—"}
        className="text-dense text-muted-foreground font-mono"
      />
    </>
  );
}

function renderTypeCell(row: StockTransaction) {
  const config = MOVEMENT_TYPE_CONFIG[row.transactionType];
  return (
    <Badge variant="outline" className={`h-4 text-micro px-1.5 py-0 font-medium ${config.className}`}>
      {config.label}
    </Badge>
  );
}

function renderQtyCell(row: StockTransaction) {
  const absQty = Math.abs(row.quantityChange);
  const isPositive = row.quantityChange >= 0;
  return (
    <span
      className={`text-dense font-mono tabular-nums font-semibold ${
        isPositive ? "text-status-success-ink" : "text-status-danger-ink"
      }`}
    >
      {isPositive ? `+${absQty}` : `-${absQty}`}
    </span>
  );
}

function renderLocationCell(row: StockTransaction) {
  return (
    <TruncatedText text={row.location?.name ?? "—"} className="text-dense text-foreground" />
  );
}

function renderUserCell(row: StockTransaction) {
  return (
    <TruncatedText text={row.creator?.name ?? "System"} className="text-dense text-muted-foreground" />
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
  const movementsState = useCanState("inventory:stock:read");
  const { data, isPending, error, refetch } = useStockTransactions({ limit: 10 });
  const movements = data?.items ?? [];

  function handleRetry(): void {
    void refetch();
  }

  if (movementsState === "denied") {
    return <NoPermissionState compact permission="inventory:stock:read" />;
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
      isLoading={isPending}
      emptyState={MOVEMENTS_EMPTY}
    />
  );
}
