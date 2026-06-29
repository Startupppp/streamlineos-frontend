"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, TrendingDown, CheckCircle2, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

function StockTable({ rows }: { rows: StockLevelRow[] }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="text-xs font-semibold">Status</TableHead>
            <TableHead className="text-xs font-semibold">Product</TableHead>
            <TableHead className="text-xs font-semibold">SKU</TableHead>
            <TableHead className="text-xs font-semibold">Warehouse / Location</TableHead>
            <TableHead className="text-xs font-semibold text-right">On Hand</TableHead>
            <TableHead className="text-xs font-semibold text-right">Committed</TableHead>
            <TableHead className="text-xs font-semibold text-right">On Order</TableHead>
            <TableHead className="text-xs font-semibold text-right">Available</TableHead>
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
                  "text-sm",
                  status === "critical" && "bg-red-50/40 hover:bg-red-50/60",
                  status === "low" && "bg-amber-50/40 hover:bg-amber-50/60",
                )}
              >
                <TableCell className="py-2.5">
                  <StockStatusIcon status={status} />
                </TableCell>
                <TableCell className="py-2.5 font-medium max-w-[200px] truncate">
                  {row.productName}
                </TableCell>
                <TableCell className="py-2.5 font-mono text-xs text-muted-foreground">
                  {row.sku}
                </TableCell>
                <TableCell className="py-2.5 text-muted-foreground text-xs">
                  {[row.warehouseName, row.locationCode].filter(Boolean).join(" / ") || "—"}
                </TableCell>
                <TableCell className="py-2.5 text-right tabular-nums">
                  {row.onHand.toLocaleString()}
                </TableCell>
                <TableCell className="py-2.5 text-right tabular-nums text-muted-foreground">
                  {row.committed.toLocaleString()}
                </TableCell>
                <TableCell className="py-2.5 text-right tabular-nums text-muted-foreground">
                  {row.onOrder.toLocaleString()}
                </TableCell>
                <TableCell
                  className={cn(
                    "py-2.5 text-right tabular-nums font-semibold",
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
  );
}

function StockTableSkeleton() {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {Array.from({ length: 8 }).map((_, i) => (
              <TableHead key={i}><Skeleton className="h-3 w-16" /></TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 8 }).map((__, j) => (
                <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function StockLevelsPage() {
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const { data: stockData, isLoading: stockLoading, isError: stockError, refetch } = useStockLevels(
    warehouseId ? { warehouseId } : undefined,
  );
  const { data: warehousesData } = useWarehouses();

  const warehouses: WarehouseOption[] = Array.isArray(warehousesData) ? warehousesData : [];

  const rawRows = useMemo<StockLevelRow[]>(() => stockData?.items ?? [], [stockData]);

  const rows = useMemo(() => {
    if (!lowStockOnly) return rawRows;
    return rawRows.filter((r) => getStockStatus(r) !== "ok");
  }, [rawRows, lowStockOnly]);

  const handleWarehouseChange = useCallback((val: string) => {
    setWarehouseId(val === "all" ? undefined : Number(val));
  }, []);

  const handleLowStockToggle = useCallback((checked: boolean) => {
    setLowStockOnly(checked);
  }, []);

  function handleRetry() { void refetch(); }
  function handleClearFilter() { setLowStockOnly(false); }

  return (
    <PageWrapper
      title="Stock Levels"
      subtitle="Monitor on-hand, committed, and available inventory across locations"
      badge={String(rows.length)}
      filters={
        <>
          <Select
            value={warehouseId ? String(warehouseId) : "all"}
            onValueChange={handleWarehouseChange}
          >
            <SelectTrigger className="h-8 text-xs w-44">
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
          <div className="flex items-center gap-2">
            <Switch
              id="low-stock-toggle"
              checked={lowStockOnly}
              onCheckedChange={handleLowStockToggle}
              className="scale-90"
            />
            <Label
              htmlFor="low-stock-toggle"
              className="text-xs text-muted-foreground cursor-pointer select-none"
            >
              Low stock only
            </Label>
          </div>
          <div className="flex items-center gap-3 ml-auto text-[11px] text-muted-foreground">
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
        </>
      }
    >
      {stockLoading ? (
        <StockTableSkeleton />
      ) : stockError ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <EmptyState
            illustration={<AlertTriangle className="h-12 w-12 text-muted-foreground/40" aria-hidden="true" />}
            title="Failed to load stock levels"
            description="An error occurred while fetching stock data. Please try again."
            action={{ label: "Retry", onClick: handleRetry }}
          />
        </motion.div>
      ) : rows.length === 0 ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <EmptyState
            illustration={
              lowStockOnly
                ? <CheckCircle2 className="h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
                : <Package className="h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
            }
            title={lowStockOnly ? "No low-stock items" : "No stock records"}
            description={
              lowStockOnly
                ? "All items are stocked above their minimum levels."
                : "Stock levels will appear here once products are received."
            }
            action={
              lowStockOnly
                ? { label: "Show All Items", onClick: handleClearFilter }
                : { label: "Record Adjustment", href: "/inventory/stock/adjustments" }
            }
          />
        </motion.div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp}>
            <StockTable rows={rows} />
          </motion.div>
        </motion.div>
      )}
    </PageWrapper>
  );
}
