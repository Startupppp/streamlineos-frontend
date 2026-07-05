"use client";

import { memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, TrendingDown, CheckCircle2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type StockLevelRow } from "@/hooks/api/inventory/stock";
import { cn } from "@/lib/utils";

type StockStatus = "critical" | "low" | "ok";

const STOCK_STATUS_ORDER: Record<StockStatus, number> = { critical: 0, low: 1, ok: 2 };

export function getStockStatus(row: StockLevelRow): StockStatus {
  const avail = row.available;
  if (row.reorderPoint != null && avail <= row.reorderPoint) return "critical";
  if (row.minStockLevel != null && avail <= row.minStockLevel) return "low";
  return "ok";
}

export { STOCK_STATUS_ORDER };

const StockStatusIcon = memo(function StockStatusIcon({ status }: { status: StockStatus }) {
  if (status === "critical") {
    return <AlertTriangle className="h-3.5 w-3.5 text-red-500" aria-label="Below reorder point" />;
  }
  if (status === "low") {
    return <TrendingDown className="h-3.5 w-3.5 text-amber-500" aria-label="Below minimum stock" />;
  }
  return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-label="Stock OK" />;
});

const TH = "text-[10px] uppercase tracking-wider font-bold px-2 py-1.5";

interface StockLevelsTableProps {
  rows: StockLevelRow[];
}

export const StockLevelsTable = memo(function StockLevelsTable({ rows }: StockLevelsTableProps) {
  const router = useRouter();

  const handleAdjust = useCallback((row: StockLevelRow) => {
    const params = row.variantId ? `?variantId=${row.variantId}` : "";
    router.push(`/inventory/stock/adjustments${params}`);
  }, [router]);

  const handleTransfer = useCallback(() => {
    router.push("/inventory/stock/transfers");
  }, [router]);

  const handleMovements = useCallback((row: StockLevelRow) => {
    const params = row.variantId ? `?variantId=${row.variantId}` : "";
    router.push(`/inventory/stock/movements${params}`);
  }, [router]);

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
              <TableHead className={cn(TH, "text-right hidden lg:table-cell")}>Blocked</TableHead>
              <TableHead className={cn(TH, "text-right hidden lg:table-cell")}>Qual. Hold</TableHead>
              <TableHead className={cn(TH, "text-right hidden lg:table-cell")}>Avg Cost</TableHead>
              <TableHead className={cn(TH, "w-8")} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const status = getStockStatus(row);
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
                    {row.available.toLocaleString()}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "px-2 py-1 text-right font-mono tabular-nums text-[11px] hidden lg:table-cell",
                      row.blockedQty > 0 && "text-amber-600 font-medium",
                      row.blockedQty === 0 && "text-muted-foreground",
                    )}
                  >
                    {row.blockedQty.toLocaleString()}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "px-2 py-1 text-right font-mono tabular-nums text-[11px] hidden lg:table-cell",
                      row.qualityHoldQty > 0 && "text-red-600 font-medium",
                      row.qualityHoldQty === 0 && "text-muted-foreground",
                    )}
                  >
                    {row.qualityHoldQty.toLocaleString()}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right font-mono tabular-nums text-[11px] text-muted-foreground hidden lg:table-cell">
                    {row.averageCost ?? "—"}
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          aria-label={`Actions for ${row.productName}`}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => handleAdjust(row)}
                        >
                          Adjust
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={handleTransfer}
                        >
                          Transfer
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => handleMovements(row)}
                        >
                          View Movements
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
});

export type { StockStatus };
