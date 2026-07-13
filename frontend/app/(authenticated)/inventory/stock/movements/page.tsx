"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyActivityIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useStockTransactions,
  type StockTransaction,
  type TransactionType,
  type StockTransactionDirection,
} from "@/hooks/api/inventory/stock";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import { useCan } from "@/hooks/api/access";
import { cn } from "@/lib/utils";
import Link from "next/link";

const LIMIT = 25;

const TXN_TYPE_CONFIG: Record<TransactionType, { label: string; badgeClass: string }> = {
  PURCHASE: { label: "Purchase", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  SALE: { label: "Sale", badgeClass: "bg-red-50 text-red-700 border-red-200" },
  GRN: { label: "GRN", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  ADJUSTMENT_IN: { label: "Adj In", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ADJUSTMENT_OUT: { label: "Adj Out", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  TRANSFER_IN: { label: "Transfer In", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  TRANSFER_OUT: { label: "Transfer Out", badgeClass: "bg-muted text-muted-foreground border-border" },
  RETURN_IN: { label: "Return In", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  RETURN_OUT: { label: "Return Out", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  OPENING_BALANCE: { label: "Opening Balance", badgeClass: "bg-violet-50 text-violet-700 border-violet-200" },
  VENDOR_RETURN: { label: "Vendor Return", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  CUSTOMER_RETURN: { label: "Customer Return", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CYCLE_COUNT_GAIN: { label: "Count Gain", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CYCLE_COUNT_LOSS: { label: "Count Loss", badgeClass: "bg-red-50 text-red-700 border-red-200" },
  SCRAP: { label: "Scrap", badgeClass: "bg-red-50 text-red-700 border-red-200" },
  QUARANTINE_IN: { label: "Quarantine In", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  QUARANTINE_OUT: { label: "Quarantine Out", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  RESERVATION_CREATE: { label: "Reserved", badgeClass: "bg-muted text-muted-foreground border-border" },
  RESERVATION_RELEASE: { label: "Res. Released", badgeClass: "bg-muted text-muted-foreground border-border" },
  RESERVATION_CONSUME: { label: "Res. Consumed", badgeClass: "bg-muted text-muted-foreground border-border" },
};

type DatePreset = "today" | "7d" | "30d" | "90d" | "all";

function getDateRange(preset: DatePreset): { fromDate?: string; toDate?: string } {
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

function isDatePreset(val: string): val is DatePreset {
  return val === "today" || val === "7d" || val === "30d" || val === "90d" || val === "all";
}

function isTransactionTypeOrAll(val: string): val is TransactionType | "all" {
  return val === "all" || val in TXN_TYPE_CONFIG;
}

function isDirectionOrAll(val: string): val is StockTransactionDirection | "all" {
  return val === "all" || val === "in" || val === "out";
}

const ALL_TXN_TYPES = Object.keys(TXN_TYPE_CONFIG) as TransactionType[];

const SOURCE_ROUTES: Record<string, string> = {
  PO: "/inventory/purchase-orders",
  SO: "/inventory/sales-orders",
  TRANSFER: "/inventory/stock/transfers",
  ADJUSTMENT: "/inventory/stock/adjustments",
};

function renderTypeCell(row: StockTransaction) {
  const cfg = TXN_TYPE_CONFIG[row.transactionType];
  return (
    <Badge variant="outline" className={cn("h-4 text-[9px] px-1.5 py-0 font-medium whitespace-nowrap", cfg.badgeClass)}>
      {cfg.label}
    </Badge>
  );
}

function renderProductCell(row: StockTransaction) {
  return (
    <div>
      <div className="font-medium text-[11px] text-foreground truncate max-w-[160px]">
        {row.productVariant?.product?.name ?? row.productVariant?.name ?? "—"}
      </div>
      <div className="text-[10px] font-mono text-muted-foreground">
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
      <div className="text-[11px] text-foreground truncate max-w-[120px]">{warehouse}</div>
      {location && <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{location}</div>}
    </div>
  );
}

function renderQtyChangeCell(row: StockTransaction) {
  const isPositive = row.quantityChange > 0;
  return (
    <span className={cn("font-mono tabular-nums font-semibold", isPositive ? "text-emerald-600" : "text-red-600")}>
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
        className="font-mono text-blue-600 hover:underline text-[11px]"
        onClick={(e) => e.stopPropagation()}
      >
        {refLabel}
      </Link>
    );
  }
  return <span className="text-muted-foreground font-mono text-[11px]">{refLabel}</span>;
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

const MOVEMENTS_COLUMNS: DataTableColumn<StockTransaction>[] = [
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
    className: "text-muted-foreground text-[11px]",
    cell: renderByCell,
  },
  {
    key: "notes",
    header: "Notes",
    className: "text-[11px]",
    cell: renderNotesCell,
  },
];

export default function MovementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const dateParam = searchParams.get("date") ?? "30d";
  const typeParam = searchParams.get("type") ?? "all";
  const dirParam = searchParams.get("dir") ?? "all";
  const warehouseParam = searchParams.get("warehouse") ?? "all";
  const searchQ = searchParams.get("q") ?? "";

  const datePreset: DatePreset = isDatePreset(dateParam) ? dateParam : "30d";
  const txnTypeFilter: TransactionType | "all" = isTransactionTypeOrAll(typeParam) ? typeParam : "all";
  const dirFilter: StockTransactionDirection | "all" = isDirectionOrAll(dirParam) ? dirParam : "all";
  const warehouseId = warehouseParam !== "all" ? Number(warehouseParam) || undefined : undefined;

  const [page, setPage] = useState(1);

  const dateRange = useMemo(() => getDateRange(datePreset), [datePreset]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (datePreset !== "30d") count++;
    if (txnTypeFilter !== "all") count++;
    if (dirFilter !== "all") count++;
    if (warehouseParam !== "all") count++;
    if (searchQ) count++;
    return count;
  }, [datePreset, txnTypeFilter, dirFilter, warehouseParam, searchQ]);

  const hasActiveFilters = activeFilterCount > 0;

  const filters = useMemo(
    () => ({
      ...dateRange,
      ...(txnTypeFilter !== "all" ? { transactionType: txnTypeFilter } : {}),
      ...(dirFilter !== "all" ? { direction: dirFilter } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(searchQ ? { search: searchQ } : {}),
      page,
      limit: LIMIT,
    }),
    [dateRange, txnTypeFilter, dirFilter, warehouseId, searchQ, page],
  );

  const { data: txnData, isLoading, isError, refetch } = useStockTransactions(filters);
  const { data: warehouses } = useWarehouses();

  const canAdjust = useCan("inventory:stock:adjust");
  const canTransfer = useCan("inventory:stock:transfer");

  const total = txnData?.total ?? 0;
  const currentPage = txnData?.page ?? page;

  const transactions = txnData?.items ?? [];

  const handleDatePresetChange = useCallback((val: string) => {
    if (isDatePreset(val)) {
      const params = new URLSearchParams(searchParams.toString());
      if (val === "30d") params.delete("date");
      else params.set("date", val);
      router.replace(`?${params.toString()}`);
      setPage(1);
    }
  }, [router, searchParams]);

  const handleTypeChange = useCallback((val: string) => {
    if (isTransactionTypeOrAll(val)) {
      const params = new URLSearchParams(searchParams.toString());
      if (val === "all") params.delete("type");
      else params.set("type", val);
      router.replace(`?${params.toString()}`);
      setPage(1);
    }
  }, [router, searchParams]);

  const handleDirChange = useCallback((val: string) => {
    if (isDirectionOrAll(val)) {
      const params = new URLSearchParams(searchParams.toString());
      if (val === "all") params.delete("dir");
      else params.set("dir", val);
      router.replace(`?${params.toString()}`);
      setPage(1);
    }
  }, [router, searchParams]);

  const handleWarehouseChange = useCallback((val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val === "all") params.delete("warehouse");
    else params.set("warehouse", val);
    router.replace(`?${params.toString()}`);
    setPage(1);
  }, [router, searchParams]);

  function handleRetry() { void refetch(); }

  function handleResetFilters() {
    router.replace("?");
    setPage(1);
  }

  function handleSearchChange(val: string): void {
    const params = new URLSearchParams(searchParams.toString());
    if (val) params.set("q", val);
    else params.delete("q");
    router.replace(`?${params.toString()}`);
    setPage(1);
  }

  const subtitle = "Track every stock change from receipts, sales, transfers, adjustments, opening stock, and returns.";

  return (
    <PageWrapper
      title="Stock Movements"
      eyebrow="Inventory / Stock"
      subtitle={subtitle}
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
          <div className="hidden sm:flex min-w-0 flex-row flex-nowrap items-center gap-2">
            <Select value={txnTypeFilter} onValueChange={handleTypeChange}>
              <SelectTrigger className="h-8 text-xs w-[150px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {ALL_TXN_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TXN_TYPE_CONFIG[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dirFilter} onValueChange={handleDirChange}>
              <SelectTrigger className="h-8 text-xs w-[120px]">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All directions</SelectItem>
                <SelectItem value="in">Inbound (+)</SelectItem>
                <SelectItem value="out">Outbound (−)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={warehouseParam} onValueChange={handleWarehouseChange}>
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue placeholder="All warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All warehouses</SelectItem>
                {(warehouses ?? []).map((w) => (
                  <SelectItem key={w.id} value={String(w.id)}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={datePreset} onValueChange={handleDatePresetChange}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground gap-1.5"
                onClick={handleResetFilters}
              >
                Clear filters
                <Badge variant="secondary" className="h-4 text-[9px] px-1.5 py-0">
                  {activeFilterCount}
                </Badge>
              </Button>
            )}
          </div>
        </div>
      }
    >
      {isError ? (
        <ErrorState
          title="Failed to load movements"
          description="An error occurred while fetching stock transactions."
          onRetry={handleRetry}
          className="flex-1 min-h-[40vh]"
        />
      ) : transactions.length === 0 && !isLoading ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          {hasActiveFilters ? (
            <InventoryEmptyState
              illustration={<EmptySearchIllustration />}
              title="No movements match your filters"
              description="Try adjusting or clearing your filters to see stock movements."
              action={{ label: "Clear Filters", onClick: handleResetFilters }}
              className="flex-1 min-h-[40vh]"
            />
          ) : (
            <InventoryEmptyState
              illustration={<EmptyActivityIllustration />}
              title="No stock movements yet"
              description="Stock movements are created when you receive purchase orders, process sales, make adjustments, record opening stock, or transfer inventory between locations."
              className="flex-1 min-h-[40vh]"
              action={
                canAdjust
                  ? { label: "Record Opening Stock", href: "/inventory/stock?opening=1" }
                  : undefined
              }
              secondaryAction={
                canAdjust
                  ? { label: "Create Adjustment", href: "/inventory/stock/adjustments/new" }
                  : undefined
              }
            />
          )}
          {!hasActiveFilters && (
            <motion.div variants={fadeUp} className="mt-6 flex flex-wrap justify-center gap-3 pb-4">
              {canAdjust && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/inventory/purchase-orders/new">Receive Purchase Order</Link>
                </Button>
              )}
              {canTransfer && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/inventory/stock/transfers">Create Transfer</Link>
                </Button>
              )}
            </motion.div>
          )}
        </motion.div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
          <motion.div variants={fadeUp}>
            <DataTable
              data={transactions}
              columns={MOVEMENTS_COLUMNS}
              getRowKey={(row) => row.id}
              isLoading={isLoading}
              pagination={{
                mode: "server",
                page: currentPage,
                pageSize: LIMIT,
                total,
                onPageChange: setPage,
              }}
              search={{
                value: searchQ,
                onChange: handleSearchChange,
                placeholder: "Search product, SKU, barcode, location…",
              }}
              minWidth="900px"
            />
          </motion.div>
        </motion.div>
      )}
    </PageWrapper>
  );
}
