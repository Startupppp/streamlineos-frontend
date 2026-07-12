"use client";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrencyFull } from "@/lib/format-utils";
import type { ProfitabilityRow } from "@/hooks/api/accounting/reports";
import { cn } from "@/lib/utils";

interface ProfitabilityTableProps {
  data: ProfitabilityRow[];
  nameKey: "projectName" | "departmentName";
}

export function ProfitabilityTable({ data, nameKey }: ProfitabilityTableProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Name</TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Revenue</TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Cost</TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Margin</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[160px]">Margin %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, i) => {
              const name = nameKey === "projectName" ? row.projectName : row.departmentName;
              const pct = Number(row.marginPct) || 0;
              const isPositive = pct >= 0;
              return (
                <TableRow key={i} className="border-b border-border/50 hover:bg-muted/30">
                  <TableCell className="text-sm text-foreground px-3 py-2">{name ?? "—"}</TableCell>
                  <TableCell className="text-right text-sm font-mono tabular-nums px-3 py-2">
                    {formatCurrencyFull(Number(row.revenue))}
                  </TableCell>
                  <TableCell className="text-right text-sm font-mono tabular-nums px-3 py-2">
                    {formatCurrencyFull(Number(row.cost))}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right text-sm font-mono tabular-nums font-medium px-3 py-2",
                    isPositive ? "text-emerald-600" : "text-red-600",
                  )}>
                    {formatCurrencyFull(Number(row.margin))}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            isPositive ? "bg-emerald-500" : "bg-red-500",
                          )}
                          style={{ width: `${Math.min(Math.abs(pct), 100)}%` }}
                        />
                      </div>
                      <span className={cn(
                        "text-xs font-mono tabular-nums w-12 text-right shrink-0",
                        isPositive ? "text-emerald-600" : "text-red-600",
                      )}>
                        {pct.toFixed(1)}%
                      </span>
                    </div>
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
