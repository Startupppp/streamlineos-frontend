"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, TrendingDown, CheckCircle2, Search } from "lucide-react";
import { EmptyWarehouseIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { Input } from "@/components/ui/input";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SkeletonTable } from "@/components/shared/skeletons/skeleton-table";
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

const PAGE_LIMIT = 50;

export default function StockLevelsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const viewParam = searchParams.get("view") ?? "levels";
  const warehouseParam = searchParams.get("warehouse") ?? "all";
  const locationParam = searchParams.get("location") ?? "all";
  const stockStatusParam = searchParams.get("stockStatus") ?? "all";
  const searchQ = searchParams.get("q") ?? "";
  const pageParam = Number(searchParams.get("page") ?? "1") || 1;

  const warehouseId = warehouseParam !== "all" ? Number(warehouseParam) || undefined : undefined;
  const locationId = locationParam !== "all" && warehouseId ? Number(locationParam) || undefined : undefined;
  const lowStock = stockStatusParam === "true" ? true : undefined;
  const negative = stockStatusParam === "negative" ? true : undefined;

  const [page, setPage] = useState(pageParam);
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
      search: searchQ || undefined,
      page,
      limit: PAGE_LIMIT,
    }),
    [warehouseId, locationId, lowStock, negative, searchQ, page],
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

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (e.target.value) params.set("q", e.target.value);
      else params.delete("q");
      params.delete("page");
      setPage(1);
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

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
    searchQ || warehouseParam !== "all" || stockStatusParam !== "all" || locationParam !== "all";
  const subtitle = stockData
    ? `${total} item${total !== 1 ? "s" : ""}`
    : undefined;

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
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 lg:max-w-xs">
        <Search
          className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />
        <Input
          placeholder="Search product or SKU…"
          value={searchQ}
          onChange={handleSearchChange}
          className="h-8 w-full pl-8 text-xs"
        />
      </div>
      <div className="flex min-w-0 flex-row flex-nowrap items-center gap-2">
        <Select value={warehouseParam} onValueChange={handleWarehouseChange}>
          <SelectTrigger className="h-8 text-xs w-[160px]">
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
            <SelectTrigger className="h-8 text-xs w-[160px]">
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
          <SelectTrigger className="h-8 text-xs w-[160px]">
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
        eyebrow="Inventory / Stock"
        subtitle={subtitle}
        actions={
          <div className="flex items-center gap-2">
            {viewToggle}
            {canAdjust && (
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleOpenOpeningStock}>
                Opening Stock
              </Button>
            )}
          </div>
        }
        filters={viewParam === "levels" ? levelsFilters : undefined}
      >
        {viewParam === "reservations" ? (
          <ReservationsPanel />
        ) : stockLoading ? (
          <SkeletonTable rows={8} columns={8} />
        ) : stockError ? (
          <ErrorState
            title="Failed to load stock levels"
            description="An error occurred while fetching stock data. Please try again."
            onRetry={handleRetry}
            className="flex-1 min-h-[40vh]"
          />
        ) : rows.length === 0 ? (
          <motion.div variants={fadeUp} initial="hidden" animate="visible">
            <EmptyState
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
              className="flex-1 min-h-[40vh]"
            />
          </motion.div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            <motion.div variants={fadeUp}>
              <StockLevelsTable rows={rows} onShowAvailability={handleShowAvailability} />
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
                    className="h-7 text-xs"
                    disabled={page <= 1}
                    onClick={handlePrevPage}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
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
