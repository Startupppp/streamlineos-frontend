"use client";

import { memo, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, TrendingDown, CheckCircle2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
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

interface StockLevelsTableProps {
  rows: StockLevelRow[];
  onShowAvailability?: (variantId: number, variantName: string) => void;
}

export const StockLevelsTable = memo(function StockLevelsTable({ rows, onShowAvailability }: StockLevelsTableProps) {
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

  const handleAvailability = useCallback((row: StockLevelRow) => {
    if (row.variantId && onShowAvailability) {
      onShowAvailability(row.variantId, row.productName);
    }
  }, [onShowAvailability]);

  const columns = useMemo<DataTableColumn<StockLevelRow>[]>(() => [
    {
      key: "status",
      header: "Status",
      cell: (row) => <StockStatusIcon status={getStockStatus(row)} />,
    },
    {
      key: "product",
      header: "Product",
      className: "font-medium max-w-[200px] truncate",
      cell: (row) => row.productName,
    },
    {
      key: "sku",
      header: "SKU",
      className: "font-mono text-muted-foreground hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
      cell: (row) => row.sku,
    },
    {
      key: "location",
      header: "Warehouse / Location",
      className: "text-muted-foreground hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
      cell: (row) => [row.warehouseName, row.locationCode].filter(Boolean).join(" / ") || "—",
    },
    {
      key: "onHand",
      header: "On Hand",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (row) => row.onHand.toLocaleString(),
    },
    {
      key: "committed",
      header: "Committed",
      headerClassName: "text-right hidden md:table-cell",
      className: "text-right font-mono tabular-nums text-muted-foreground hidden md:table-cell",
      cell: (row) => row.committed.toLocaleString(),
    },
    {
      key: "onOrder",
      header: "On Order",
      headerClassName: "text-right hidden md:table-cell",
      className: "text-right font-mono tabular-nums text-muted-foreground hidden md:table-cell",
      cell: (row) => row.onOrder.toLocaleString(),
    },
    {
      key: "available",
      header: "Available",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums font-semibold",
      cell: (row) => {
        const s = getStockStatus(row);
        return (
          <span className={cn(
            s === "critical" && "text-red-600",
            s === "low" && "text-amber-600",
            s === "ok" && "text-emerald-600",
          )}>
            {row.available.toLocaleString()}
          </span>
        );
      },
    },
    {
      key: "blockedQty",
      header: "Blocked",
      headerClassName: "text-right hidden lg:table-cell",
      className: "text-right font-mono tabular-nums hidden lg:table-cell",
      cell: (row) => (
        <span className={cn(
          row.blockedQty > 0 ? "text-amber-600 font-medium" : "text-muted-foreground",
        )}>
          {row.blockedQty.toLocaleString()}
        </span>
      ),
    },
    {
      key: "qualityHoldQty",
      header: "Qual. Hold",
      headerClassName: "text-right hidden lg:table-cell",
      className: "text-right font-mono tabular-nums hidden lg:table-cell",
      cell: (row) => (
        <span className={cn(
          row.qualityHoldQty > 0 ? "text-red-600 font-medium" : "text-muted-foreground",
        )}>
          {row.qualityHoldQty.toLocaleString()}
        </span>
      ),
    },
    {
      key: "averageCost",
      header: "Avg Cost",
      headerClassName: "text-right hidden lg:table-cell",
      className: "text-right font-mono tabular-nums text-muted-foreground hidden lg:table-cell",
      cell: (row) => row.averageCost ?? "—",
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-8",
      cell: (row) => (
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
            {row.variantId && onShowAvailability && (
              <DropdownMenuItem onSelect={() => handleAvailability(row)}>
                Availability
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => handleAdjust(row)}>
              Adjust
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleTransfer}>
              Transfer
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleMovements(row)}>
              View Movements
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [handleAdjust, handleTransfer, handleMovements, handleAvailability, onShowAvailability]);

  function getRowClassName(row: StockLevelRow): string {
    const s = getStockStatus(row);
    if (s === "critical") return "bg-red-50/50";
    if (s === "low") return "bg-amber-50/50";
    return "";
  }

  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowKey={(row) => row.id}
      rowClassName={getRowClassName}
    />
  );
});

export type { StockStatus };
