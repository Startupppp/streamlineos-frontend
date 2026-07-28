"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, TrendingDown, CheckCircle2 } from "lucide-react";
import { EmptyWarehouseIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { SearchInput } from "@/components/ui/search-input";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTableSkeleton } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useStockLevels } from "@/hooks/api/inventory/stock";
import { useWarehouses, useLocations } from "@/hooks/api/inventory/warehouses";
import { useCan } from "@/hooks/api/access";
import {
  StockLevelsTable,
  getStockStatus,
  STOCK_STATUS_ORDER,
} from "@/features/inventory/components/stock/stock-levels-table";
import { AvailabilityPopover } from "@/features/inventory/components/stock/availability-popover";
import { ReservationsPanel } from "@/features/inventory/components/stock/reservations-panel";
import { OpeningStockSheet } from "@/features/inventory/components/stock/opening-stock-sheet";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/common/use-debounce";

const PAGE_LIMIT = 50;

export default function StockLevelsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const viewParam = searchParams.get("view") ?? "levels";
  const warehouseParam = searchParams.get("warehouse") ?? "all";
  const locationParam = searchParams.get("location") ?? "all";
  const stockStatusParam = searchParams.get("stockStatus") ?? "all";
  const pageParam = Number(searchParams.get("page") ?? "1") || 1;

  const [searchInput, setSearchInput] = useState<string>(searchParams.get("q") ?? "");
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const warehouseId = warehouseParam !== "all" ? Number(warehouseParam) || undefined : undefined;
  const locationId = locationParam !== "all" && warehouseId ? Number(locationParam) || undefined : undefined;
  const lowStock = stockStatusParam === "true" ? true : undefined;
  const negative = stockStatusParam === "negative" ? true : undefined;

  const [page, setPage] = useState(pageParam);

  useEffect(() => {
    const trimmed = debouncedSearch.trim() || null;
    const current = searchParams.get("q") ?? null;
    if (trimmed === current) return;
    const params = new URLSearchParams(searchParams.toString());
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    params.delete("page");
    setPage(1);
    router.replace(`?${params.toString()}`);
  }, [debouncedSearch, router, searchParams]);
  const [availabilityVariantId, setAvailabilityVariantId] = useState<number | null>(null);
  const [availabilityVariantName, setAvailabilityVariantName] = useState<string>("");
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [openingStockOpen, setOpeningStockOpen] = useState(false);

  const canAdjust = useCan("inventory:stock:adjust");

  const filters = useMemo(
    () => ({
      warehouseId,
      locationId,
      lowStock,
      negative,
      search: debouncedSearch.trim() || undefined,
      page,
      limit: PAGE_LIMIT,
    }),
    [warehouseId, locationId, lowStock, negative, debouncedSearch, page],
  );

  const { data: stockData, isLoading: stockLoading, isError: stockError, refetch } =
    useStockLevels(filters);
  const { data: warehousesData } = useWarehouses();
  const { data: locationsData = [] } = useLocations(warehouseId ?? 0);

  const warehouses = Array.isArray(warehousesData) ? warehousesData : [];
  const totalPages = stockData?.totalPages ?? 1;
  const total = stockData?.total ?? stockData?.items?.length ?? 0;

  const rows = useMemo(() => {
    const rawRows = stockData?.items ?? [];
    return [...rawRows].sort(
      (a, b) => STOCK_STATUS_ORDER[getStockStatus(a)] - STOCK_STATUS_ORDER[getStockStatus(b)],
    );
  }, [stockData?.items]);

  const handleShowAvailability = useCallback((variantId: number, variantName: string) => {
    setAvailabilityVariantId(variantId);
    setAvailabilityVariantName(variantName);
    setAvailabilityOpen(true);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    setPage(1);
  }, []);

  const handleWarehouseChange = useCallback(
    (val: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (val === "all") params.delete("warehouse");
      else params.set("warehouse", val);
      params.delete("location");
      params.delete("page");
      setPage(1);
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleLocationChange = useCallback(
    (val: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (val === "all") params.delete("location");
      else params.set("location", val);
      params.delete("page");
      setPage(1);
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleStockStatusChange = useCallback(
    (val: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (val === "all") params.delete("stockStatus");
      else params.set("stockStatus", val);
      params.delete("page");
      setPage(1);
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleViewSwitch = useCallback(
    (view: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (view === "levels") params.delete("view");
      else params.set("view", view);
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  function handleRetry(): void {
    void refetch();
  }

  function handlePrevPage(): void {
    setPage((p) => Math.max(1, p - 1));
  }

  function handleNextPage(): void {
    setPage((p) => Math.min(totalPages, p + 1));
  }

  function handleOpenOpeningStock(): void {
    setOpeningStockOpen(true);
  }

  function handleSelectLevelsView(): void {
    handleViewSwitch("levels");
  }

  function handleSelectReservationsView(): void {
    handleViewSwitch("reservations");
  }

  const hasActiveFilters =
    searchInput.trim() || warehouseParam !== "all" || stockStatusParam !== "all" || locationParam !== "all";

  const viewToggle = (
    <div className="flex items-center rounded-md border border-border overflow-hidden h-8">
      <button
        type="button"
        onClick={handleSelectLevelsView}
        className={cn(
          "px-3 h-full text-xs font-medium transition-colors",
          viewParam === "levels"
            ? "bg-primary text-primary-foreground"
            : "bg-background text-muted-foreground hover:text-foreground",
        )}
      >
        Levels
      </button>
      <button
        type="button"
        onClick={handleSelectReservationsView}
        className={cn(
          "px-3 h-full text-xs font-medium transition-colors border-l border-border",
          viewParam === "reservations"
            ? "bg-primary text-primary-foreground"
            : "bg-background text-muted-foreground hover:text-foreground",
        )}
      >
        Reservations
      </button>
    </div>
  );

  const levelsFilters = (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
      <SearchInput
        className="min-w-0 flex-1 lg:max-w-xs"
        placeholder="Search product or SKU…"
        value={searchInput}
        onValueChange={handleSearchChange}
      />
      <div className="flex min-w-0 flex-row flex-nowrap items-center gap-2">
        <Select value={warehouseParam} onValueChange={handleWarehouseChange}>
          <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "text-xs w-[160px]")}>
            <SelectValue placeholder="All warehouses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All warehouses</SelectItem>
            {warehouses.map((wh) => (
              <SelectItem key={wh.id} value={String(wh.id)}>
                {wh.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {warehouseId && locationsData.length > 0 && (
          <Select value={locationParam} onValueChange={handleLocationChange}>
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "text-xs w-[160px]")}>
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {locationsData.map((loc) => (
                <SelectItem key={loc.id} value={String(loc.id)}>
                  {loc.name} ({loc.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={stockStatusParam} onValueChange={handleStockStatusChange}>
          <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "text-xs w-[160px]")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stock</SelectItem>
            <SelectItem value="true">Low stock only</SelectItem>
            <SelectItem value="negative">Negative stock only</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="ml-auto hidden lg:flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 text-red-500" aria-hidden="true" />
          Below reorder point
        </span>
        <span className="flex items-center gap-1">
          <TrendingDown className="h-3 w-3 text-amber-500" aria-hidden="true" />
          Below minimum
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" aria-hidden="true" />
          OK
        </span>
      </div>
    </div>
  );

  return (
    <>
      <PageWrapper
        title="Stock Levels"
        subtitle="Track real-time stock levels across all warehouses and locations."
        actions={
          <div className="flex items-center gap-2">
            {viewToggle}
            {canAdjust && (
              <Button variant="outline" size="sm" className="text-xs" onClick={handleOpenOpeningStock}>
                Opening Stock
              </Button>
            )}
          </div>
        }
        filters={viewParam === "levels" ? levelsFilters : undefined}
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
        {viewParam === "reservations" ? (
          <ReservationsPanel />
        ) : stockLoading ? (
          <DataTableSkeleton rows={12} columns={8} className="flex-1" />
        ) : stockError ? (
          <ErrorState
            title="Failed to load stock levels"
            description="An error occurred while fetching stock data. Please try again."
            onRetry={handleRetry}
            className="flex-1"
          />
        ) : rows.length === 0 ? (
          <motion.div variants={fadeUp} initial="hidden" animate="visible">
            <InventoryEmptyState
              illustration={
                hasActiveFilters ? <EmptySearchIllustration /> : <EmptyWarehouseIllustration />
              }
              title={hasActiveFilters ? "No results" : "No stock records"}
              description={
                hasActiveFilters
                  ? "No items match your filters."
                  : "Record opening stock to begin tracking inventory levels."
              }
              action={
                hasActiveFilters
                  ? { label: "Clear Filters", href: "?" }
                  : canAdjust
                    ? { label: "Record Opening Stock", onClick: handleOpenOpeningStock }
                    : undefined
              }
              className="flex-1"
            />
          </motion.div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-1 min-h-0 flex-col">
            <motion.div variants={fadeUp} className="flex flex-1 min-h-0 flex-col">
              <StockLevelsTable rows={rows} onShowAvailability={handleShowAvailability} className="flex-1 min-h-0" />
            </motion.div>
            {totalPages > 1 && (
              <div className="mt-3 shrink-0 flex items-center justify-between px-1 py-2">
                <span className="text-xs text-muted-foreground">
                  Showing {rows.length > 0 ? (page - 1) * PAGE_LIMIT + 1 : 0}–{Math.min(page * PAGE_LIMIT, total)} of {total}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    disabled={page <= 1}
                    onClick={handlePrevPage}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    disabled={page >= totalPages}
                    onClick={handleNextPage}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
        </div>
      </PageWrapper>

      <AvailabilityPopover
        open={availabilityOpen}
        onOpenChange={setAvailabilityOpen}
        variantId={availabilityVariantId}
        variantName={availabilityVariantName}
      />

      <OpeningStockSheet
        open={openingStockOpen}
        onOpenChange={setOpeningStockOpen}
      />
    </>
  );
}
