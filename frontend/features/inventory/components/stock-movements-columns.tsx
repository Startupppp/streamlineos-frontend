"use client";

import { format, subDays, startOfDay, endOfDay } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DataTableColumn } from "@/components/ui/data-table";
import type {
  StockTransaction,
  TransactionType,
  StockTransactionDirection,
} from "@/hooks/api/inventory/stock";

export const TXN_TYPE_CONFIG: Record<TransactionType, { label: string; badgeClass: string }> = {
  PURCHASE: { label: "Purchase", badgeClass: "bg-status-success-surface text-status-success-ink border-status-success-rule" },
  SALE: { label: "Sale", badgeClass: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule" },
  GRN: { label: "GRN", badgeClass: "bg-status-info-surface text-status-info-ink border-status-info-rule" },
  ADJUSTMENT_IN: { label: "Adj In", badgeClass: "bg-status-success-surface text-status-success-ink border-status-success-rule" },
  ADJUSTMENT_OUT: { label: "Adj Out", badgeClass: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule" },
  TRANSFER_IN: { label: "Transfer In", badgeClass: "bg-status-info-surface text-status-info-ink border-status-info-rule" },
  TRANSFER_OUT: { label: "Transfer Out", badgeClass: "bg-muted text-muted-foreground border-border" },
  RETURN_IN: { label: "Return In", badgeClass: "bg-status-success-surface text-status-success-ink border-status-success-rule" },
  RETURN_OUT: { label: "Return Out", badgeClass: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule" },
  OPENING_BALANCE: { label: "Opening Balance", badgeClass: "bg-status-info-surface text-status-info-ink border-status-info-rule" },
  VENDOR_RETURN: { label: "Vendor Return", badgeClass: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule" },
  CUSTOMER_RETURN: { label: "Customer Return", badgeClass: "bg-status-success-surface text-status-success-ink border-status-success-rule" },
  CYCLE_COUNT_GAIN: { label: "Count Gain", badgeClass: "bg-status-success-surface text-status-success-ink border-status-success-rule" },
  CYCLE_COUNT_LOSS: { label: "Count Loss", badgeClass: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule" },
  SCRAP: { label: "Scrap", badgeClass: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule" },
  QUARANTINE_IN: { label: "Quarantine In", badgeClass: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule" },
  QUARANTINE_OUT: { label: "Quarantine Out", badgeClass: "bg-status-info-surface text-status-info-ink border-status-info-rule" },
  RESERVATION_CREATE: { label: "Reserved", badgeClass: "bg-muted text-muted-foreground border-border" },
  RESERVATION_RELEASE: { label: "Res. Released", badgeClass: "bg-muted text-muted-foreground border-border" },
  RESERVATION_CONSUME: { label: "Res. Consumed", badgeClass: "bg-muted text-muted-foreground border-border" },
};

export type DatePreset = "today" | "7d" | "30d" | "90d" | "all";

export function getDateRange(preset: DatePreset): { fromDate?: string; toDate?: string } {
  if (preset === "all") return {};
  const now = new Date();
  if (preset === "today") {
    return {
      fromDate: format(startOfDay(now), "yyyy-MM-dd"),
      toDate: format(endOfDay(now), "yyyy-MM-dd"),
    };
  }
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  return {
    fromDate: format(startOfDay(subDays(now, days)), "yyyy-MM-dd"),
    toDate: format(endOfDay(now), "yyyy-MM-dd"),
  };
}

export function isDatePreset(val: string): val is DatePreset {
  return val === "today" || val === "7d" || val === "30d" || val === "90d" || val === "all";
}

export function isTransactionTypeOrAll(val: string): val is TransactionType | "all" {
  return val === "all" || Object.keys(TXN_TYPE_CONFIG).includes(val);
}

export function isDirectionOrAll(val: string): val is StockTransactionDirection | "all" {
  return val === "all" || val === "in" || val === "out";
}

export const ALL_TXN_TYPES = Object.keys(TXN_TYPE_CONFIG) as TransactionType[];

const SOURCE_ROUTES: Record<string, string> = {
  PO: "/inventory/purchase-orders",
  SO: "/inventory/sales-orders",
  TRANSFER: "/inventory/stock/transfers",
  ADJUSTMENT: "/inventory/stock/adjustments",
};

function renderTypeCell(row: StockTransaction) {
  const cfg = TXN_TYPE_CONFIG[row.transactionType];
  return (
    <Badge variant="outline" className={cn("h-4 text-micro px-1.5 py-0 font-medium whitespace-nowrap", cfg.badgeClass)}>
      {cfg.label}
    </Badge>
  );
}

function renderProductCell(row: StockTransaction) {
  return (
    <div>
      <div className="font-medium text-dense text-foreground truncate max-w-[160px]">
        {row.productVariant?.product?.name ?? row.productVariant?.name ?? "—"}
      </div>
      <div className="text-micro font-mono text-muted-foreground">
        {row.productVariant?.sku ?? "—"}
      </div>
    </div>
  );
}

function renderWarehouseCell(row: StockTransaction) {
  const warehouse = row.location?.warehouse?.name ?? "—";
  const location = row.location?.name ?? null;
  return (
    <div>
      <div className="text-dense text-foreground truncate max-w-[120px]">{warehouse}</div>
      {location && <div className="text-micro text-muted-foreground truncate max-w-[120px]">{location}</div>}
    </div>
  );
}

function renderQtyChangeCell(row: StockTransaction) {
  const isPositive = row.quantityChange > 0;
  return (
    <span className={cn("font-mono tabular-nums font-semibold", isPositive ? "text-status-success-ink" : "text-status-danger-ink")}>
      {isPositive ? "+" : ""}{row.quantityChange.toLocaleString()}
    </span>
  );
}

function renderBalanceCell(row: StockTransaction) {
  return <span className="font-mono tabular-nums font-medium">{Number(row.quantityAfter).toLocaleString()}</span>;
}

function renderSourceCell(row: StockTransaction) {
  if (!row.referenceType && !row.referenceId) return <span className="text-muted-foreground">—</span>;
  const refLabel = [row.referenceType, row.referenceId].filter(Boolean).join(" #");
  const basePath = row.referenceType ? SOURCE_ROUTES[row.referenceType] : undefined;
  if (basePath && row.referenceId) {
    return (
      <Link
        href={`${basePath}/${row.referenceId}`}
        className="font-mono text-primary hover:underline text-dense"
        onClick={(e) => e.stopPropagation()}
      >
        {refLabel}
      </Link>
    );
  }
  return <span className="text-muted-foreground font-mono text-dense">{refLabel}</span>;
}

function renderByCell(row: StockTransaction) {
  return <span className="truncate max-w-[100px] block">{row.creator?.name ?? "System"}</span>;
}

function renderDateCell(row: StockTransaction) {
  return <span className="whitespace-nowrap">{format(new Date(row.createdAt), "dd MMM yyyy, HH:mm")}</span>;
}

function renderNotesCell(row: StockTransaction) {
  if (!row.notes) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="truncate max-w-[140px] block text-muted-foreground" title={row.notes}>
      {row.notes}
    </span>
  );
}

export const MOVEMENTS_COLUMNS: DataTableColumn<StockTransaction>[] = [
  {
    key: "date",
    header: "Date",
    className: "text-muted-foreground whitespace-nowrap",
    cell: renderDateCell,
  },
  {
    key: "transactionType",
    header: "Type",
    cell: renderTypeCell,
  },
  {
    key: "product",
    header: "Product / SKU",
    cell: renderProductCell,
  },
  {
    key: "warehouse",
    header: "Warehouse / Location",
    cell: renderWarehouseCell,
  },
  {
    key: "quantityChange",
    header: "Qty Change",
    headerClassName: "text-right",
    className: "text-right",
    cell: renderQtyChangeCell,
  },
  {
    key: "quantityAfter",
    header: "Balance After",
    headerClassName: "text-right",
    className: "text-right",
    cell: renderBalanceCell,
  },
  {
    key: "source",
    header: "Source",
    className: "text-muted-foreground font-mono",
    cell: renderSourceCell,
  },
  {
    key: "by",
    header: "By",
    className: "text-muted-foreground text-dense",
    cell: renderByCell,
  },
  {
    key: "notes",
    header: "Notes",
    className: "text-dense",
    cell: renderNotesCell,
  },
];
