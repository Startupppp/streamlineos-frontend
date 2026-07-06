"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import type { LotMovement } from "@/hooks/api/inventory/traceability";

const TH = "text-[10px] uppercase tracking-wider font-bold px-2 py-1.5";

interface MovementHistoryTableProps {
  movements: LotMovement[];
}

export function MovementHistoryTable({ movements }: MovementHistoryTableProps) {
  if (movements.length === 0) {
    return (
      <InventoryEmptyState
        compact
        title="No movements recorded"
        description="Movement history will appear here once transactions occur."
      />
    );
  }

  return (
    <div className="rounded-md border border-border overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/80 hover:bg-muted/80">
              <TableHead className={TH}>Date</TableHead>
              <TableHead className={TH}>Type</TableHead>
              <TableHead className={`${TH} text-right`}>Qty</TableHead>
              <TableHead className={`${TH} hidden md:table-cell`}>Reference</TableHead>
              <TableHead className={`${TH} hidden lg:table-cell`}>Notes</TableHead>
              <TableHead className={`${TH} hidden md:table-cell`}>By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.map((m) => (
              <TableRow
                key={m.id}
                className="h-8 border-b border-border/50 hover:bg-muted/30 transition-colors"
              >
                <TableCell className="px-2 py-1 text-[11px] text-muted-foreground tabular-nums">
                  {new Date(m.createdAt).toLocaleString()}
                </TableCell>
                <TableCell className="px-2 py-1 text-[11px] font-medium text-foreground">
                  {m.type}
                </TableCell>
                <TableCell
                  className={`px-2 py-1 text-right font-mono tabular-nums text-[11px] font-semibold ${
                    m.qty >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {m.qty >= 0 ? "+" : ""}
                  {m.qty}
                </TableCell>
                <TableCell className="px-2 py-1 text-[11px] text-muted-foreground hidden md:table-cell">
                  {m.referenceType && m.referenceId
                    ? `${m.referenceType} #${m.referenceId}`
                    : "—"}
                </TableCell>
                <TableCell className="px-2 py-1 text-[11px] text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">
                  {m.notes ?? "—"}
                </TableCell>
                <TableCell className="px-2 py-1 text-[11px] text-muted-foreground hidden md:table-cell">
                  {m.performedBy ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
