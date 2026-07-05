"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import type { LotStockByLocation } from "@/hooks/api/inventory/traceability";

const TH = "text-[10px] uppercase tracking-wider font-bold px-2 py-1.5";

interface LotStockTableProps {
  stockByLocation: LotStockByLocation[];
}

export function LotStockTable({ stockByLocation }: LotStockTableProps) {
  if (stockByLocation.length === 0) {
    return (
      <EmptyState
        compact
        title="No stock on hand"
        description="This lot has no stock currently allocated to any location."
      />
    );
  }

  return (
    <div className="rounded-md border border-border overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/80 hover:bg-muted/80">
              <TableHead className={TH}>Location</TableHead>
              <TableHead className={TH}>Warehouse</TableHead>
              <TableHead className={`${TH} text-right`}>Qty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stockByLocation.map((loc) => (
              <TableRow
                key={loc.locationId}
                className="h-8 border-b border-border/50 hover:bg-muted/30 transition-colors"
              >
                <TableCell className="px-2 py-1 text-[11px] font-medium text-foreground">
                  {loc.locationName}
                </TableCell>
                <TableCell className="px-2 py-1 text-[11px] text-muted-foreground">
                  {loc.warehouseName}
                </TableCell>
                <TableCell className="px-2 py-1 text-right font-mono tabular-nums text-[11px] font-semibold text-foreground">
                  {loc.qty.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
