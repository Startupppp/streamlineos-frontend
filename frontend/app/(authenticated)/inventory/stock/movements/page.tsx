"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable } from "@/components/ui/data-table";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
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
import { useMotionVariants } from "@/lib/motion-variants";
import {
  useStockTransactions,
  type TransactionType,
  type StockTransactionDirection,
} from "@/hooks/api/inventory/stock";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import { useCan } from "@/hooks/api/access";
import { MobileFilterDrawer } from "@/features/payroll/shared/mobile-filter-drawer";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  TXN_TYPE_CONFIG,
  ALL_TXN_TYPES,
  MOVEMENTS_COLUMNS,
  DatePreset,
  getDateRange,
  isDatePreset,
  isTransactionTypeOrAll,
  isDirectionOrAll,
} from "@/features/inventory/components/stock-movements-columns";

const LIMIT = 25;

export default function MovementsPage() {
  const { staggerContainer, fadeUp } = useMotionVariants();
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

  function handleRetry(): void { void refetch(); }

  function handleResetFilters(): void {
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
      subtitle={subtitle}
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
          <div className="hidden sm:flex min-w-0 flex-row flex-nowrap items-center gap-2">
            <Select value={txnTypeFilter} onValueChange={handleTypeChange}>
              <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "text-xs w-[150px]")}>
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
              <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "text-xs w-28")}>
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All directions</SelectItem>
                <SelectItem value="in">Inbound (+)</SelectItem>
                <SelectItem value="out">Outbound (−)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={warehouseParam} onValueChange={handleWarehouseChange}>
              <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "text-xs w-[140px]")}>
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
              <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "text-xs w-32")}>
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
                className="text-xs text-muted-foreground gap-1.5"
                onClick={handleResetFilters}
              >
                Clear filters
                <Badge variant="secondary" className="h-4 text-micro px-1.5 py-0">
                  {activeFilterCount}
                </Badge>
              </Button>
            )}
          </div>
          <MobileFilterDrawer
            ariaLabel="Filter movements"
            groups={[
              {
                label: "Type",
                value: txnTypeFilter,
                options: [
                  { value: "all", label: "All types" },
                  ...ALL_TXN_TYPES.map((t) => ({
                    value: t,
                    label: TXN_TYPE_CONFIG[t].label,
                  })),
                ],
                onChange: handleTypeChange,
              },
              {
                label: "Direction",
                value: dirFilter,
                options: [
                  { value: "all", label: "All directions" },
                  { value: "in", label: "Inbound (+)" },
                  { value: "out", label: "Outbound (−)" },
                ],
                onChange: handleDirChange,
              },
              {
                label: "Warehouse",
                value: warehouseParam,
                options: [
                  { value: "all", label: "All warehouses" },
                  ...(warehouses ?? []).map((w) => ({
                    value: String(w.id),
                    label: w.name,
                  })),
                ],
                onChange: handleWarehouseChange,
              },
              {
                label: "Date range",
                value: datePreset,
                neutralValue: "30d",
                options: [
                  { value: "today", label: "Today" },
                  { value: "7d", label: "Last 7 days" },
                  { value: "30d", label: "Last 30 days" },
                  { value: "90d", label: "Last 90 days" },
                  { value: "all", label: "All time" },
                ],
                onChange: handleDatePresetChange,
              },
            ]}
          />
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
      {isError ? (
        <ErrorState
          title="Failed to load movements"
          description="An error occurred while fetching stock transactions."
          onRetry={handleRetry}
          className="flex-1"
        />
      ) : transactions.length === 0 && !isLoading ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-1 min-h-0 flex-col">
          {hasActiveFilters ? (
            <InventoryEmptyState
              illustration={<EmptySearchIllustration />}
              title="No movements match your filters"
              description="Try adjusting or clearing your filters to see stock movements."
              action={{ label: "Clear Filters", onClick: handleResetFilters }}
              className="flex-1"
            />
          ) : (
            <InventoryEmptyState
              illustration={<EmptyActivityIllustration />}
              title="No stock movements yet"
              description="Stock movements are created when you receive purchase orders, process sales, make adjustments, record opening stock, or transfer inventory between locations."
              className="flex-1"
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
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-1 min-h-0 flex-col">
          <motion.div variants={fadeUp} className="flex flex-1 min-h-0 flex-col">
            <DataTable
              className="flex-1 min-h-0"
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
      </div>
    </PageWrapper>
  );
}
