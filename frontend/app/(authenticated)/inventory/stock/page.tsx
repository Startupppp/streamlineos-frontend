"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, TrendingDown, CheckCircle2, Package, Search } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useStockLevels, type StockLevelRow } from "@/hooks/api/inventory/stock";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import { cn } from "@/lib/utils";

interface WarehouseOption {
  id: number;
  name: string;
}

type StockStatus = "critical" | "low" | "ok";

const STOCK_STATUS_ORDER: Record<StockStatus, number> = { critical: 0, low: 1, ok: 2 };

function getStockStatus(row: StockLevelRow): StockStatus {
  const available = row.onHand - row.committed;
  if (row.reorderPoint != null && available <= row.reorderPoint) return "critical";
  if (row.minStockLevel != null && available <= row.minStockLevel) return "low";
  return "ok";
}

function StockStatusIcon({ status }: { status: StockStatus }) {
  if (status === "critical") {
    return <AlertTriangle className="h-3.5 w-3.5 text-red-500" aria-label="Below reorder point" />;
  }
  if (status === "low") {
    return <TrendingDown className="h-3.5 w-3.5 text-amber-500" aria-label="Below minimum stock" />;
  }
  return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-label="Stock OK" />;
}

const TH = "text-[10px] uppercase tracking-wider font-bold px-2 py-1.5";

function StockTable({ rows }: { rows: StockLevelRow[] }) {
  return (
    <div className="rounded-md border border-border overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/80 hover:bg-muted/80">
              <TableHead className={TH}>Status</TableHead>
              <TableHead className={TH}>Product</TableHead>
              <TableHead className={cn(TH, "hidden md:table-cell")}>SKU</TableHead>
              <TableHead className={cn(TH, "hidden md:table-cell")}>Warehouse / Location</TableHead>
              <TableHead className={cn(TH, "text-right")}>On Hand</TableHead>
              <TableHead className={cn(TH, "text-right hidden md:table-cell")}>Committed</TableHead>
              <TableHead className={cn(TH, "text-right hidden md:table-cell")}>On Order</TableHead>
              <TableHead className={cn(TH, "text-right")}>Available</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const status = getStockStatus(row);
              const available = row.onHand - row.committed;
              return (
                <TableRow
                  key={row.id}
                  className={cn(
                    "h-8 border-b border-border/50 transition-colors",
                    status === "critical" && "bg-red-50/50 hover:bg-red-50/70",
                    status === "low" && "bg-amber-50/50 hover:bg-amber-50/70",
                    status === "ok" && "hover:bg-muted/30",
                  )}
                >
                  <TableCell className="px-2 py-1">
                    <StockStatusIcon status={status} />
                  </TableCell>
                  <TableCell className="px-2 py-1 font-medium max-w-[200px] truncate text-[11px]">
                    {row.productName}
                  </TableCell>
                  <TableCell className="px-2 py-1 font-mono text-[11px] text-muted-foreground hidden md:table-cell">
                    {row.sku}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-muted-foreground text-[11px] hidden md:table-cell">
                    {[row.warehouseName, row.locationCode].filter(Boolean).join(" / ") || "—"}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right font-mono tabular-nums text-[11px]">
                    {row.onHand.toLocaleString()}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right font-mono tabular-nums text-muted-foreground text-[11px] hidden md:table-cell">
                    {row.committed.toLocaleString()}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right font-mono tabular-nums text-muted-foreground text-[11px] hidden md:table-cell">
                    {row.onOrder.toLocaleString()}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "px-2 py-1 text-right font-mono tabular-nums font-semibold text-[11px]",
                      status === "critical" && "text-red-600",
                      status === "low" && "text-amber-600",
                      status === "ok" && "text-emerald-600",
                    )}
                  >
                    {available.toLocaleString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function StockLevelsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const warehouseParam = searchParams.get("warehouse") ?? "all";
  const lowStockParam = searchParams.get("lowStock") === "true";
  const searchQ = searchParams.get("q") ?? "";

  const warehouseId = warehouseParam !== "all" ? Number(warehouseParam) || undefined : undefined;

  const { data: stockData, isLoading: stockLoading, isError: stockError, refetch } =
    useStockLevels(warehouseId ? { warehouseId } : undefined);
  const { data: warehousesData } = useWarehouses();

  const warehouses: WarehouseOption[] = Array.isArray(warehousesData) ? warehousesData : [];

  const rawRows = useMemo<StockLevelRow[]>(() => stockData?.items ?? [], [stockData]);

  const rows = useMemo(() => {
    let filtered = rawRows;
    if (lowStockParam) {
      filtered = filtered.filter((r) => getStockStatus(r) !== "ok");
    }
    if (searchQ) {
      const q = searchQ.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.productName.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          (r.warehouseName?.toLowerCase().includes(q) ?? false),
      );
    }
    return [...filtered].sort(
      (a, b) => STOCK_STATUS_ORDER[getStockStatus(a)] - STOCK_STATUS_ORDER[getStockStatus(b)],
    );
  }, [rawRows, lowStockParam, searchQ]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) params.set("q", e.target.value);
    else params.delete("q");
    router.replace(`?${params.toString()}`);
  }, [router, searchParams]);

  const handleWarehouseChange = useCallback((val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val === "all") params.delete("warehouse");
    else params.set("warehouse", val);
    router.replace(`?${params.toString()}`);
  }, [router, searchParams]);

  const handleLowStockChange = useCallback((val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val === "true") params.set("lowStock", "true");
    else params.delete("lowStock");
    router.replace(`?${params.toString()}`);
  }, [router, searchParams]);

  function handleRetry() { void refetch(); }

  const hasActiveFilters = searchQ || warehouseParam !== "all" || lowStockParam;
  const subtitle = stockData ? `${rawRows.length} item${rawRows.length !== 1 ? "s" : ""}` : undefined;

  return (
    <PageWrapper
      title="Stock Levels"
      eyebrow="Inventory / Stock"
      subtitle={subtitle}
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
          <div className="relative min-w-0 flex-1 lg:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <Input
              placeholder="Search product or SKU…"
              value={searchQ}
              onChange={handleSearchChange}
              className="h-8 w-full pl-8 text-xs"
            />
          </div>
          <div className="hidden sm:flex min-w-0 flex-row flex-nowrap items-center gap-2">
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
            <Select value={lowStockParam ? "true" : "all"} onValueChange={handleLowStockChange}>
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stock levels</SelectItem>
                <SelectItem value="true">Low stock only</SelectItem>
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
      }
    >
      {stockLoading ? (
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
              hasActiveFilters
                ? <Package className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
                : <Package className="h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
            }
            title={hasActiveFilters ? "No results" : "No stock records"}
            description={
              hasActiveFilters
                ? "No items match your filters."
                : "Stock levels will appear here once products are received."
            }
            action={
              hasActiveFilters
                ? { label: "Clear Filters", href: "?" }
                : { label: "Record Adjustment", href: "/inventory/stock/adjustments" }
            }
            className="flex-1 min-h-[40vh]"
          />
        </motion.div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
          <motion.div variants={fadeUp}>
            <StockTable rows={rows} />
          </motion.div>
        </motion.div>
      )}
    </PageWrapper>
  );
}
