"use client";

import { useMemo } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { formatCurrencyFull } from "@/lib/format-utils";
import type { ProfitabilityRow } from "@/hooks/api/accounting/reports";
import { cn } from "@/lib/utils";

interface ProfitabilityTableProps {
  data: ProfitabilityRow[];
  nameKey: "projectName" | "departmentName";
}

type IndexedRow = ProfitabilityRow & { _idx: number };

function getProfitabilityRowKey(row: IndexedRow): number {
  return row._idx;
}

export function ProfitabilityTable({ data, nameKey }: ProfitabilityTableProps) {
  const indexedData = useMemo<IndexedRow[]>(
    () => data.map((r, i) => ({ ...r, _idx: i })),
    [data],
  );

  const columns = useMemo<DataTableColumn<IndexedRow>[]>(
    () => [
      {
        key: "name",
        header: "Name",
        cell: (row) => {
          const name = nameKey === "projectName" ? row.projectName : row.departmentName;
          return <TruncatedText text={name ?? "—"} className="text-sm text-foreground" />;
        },
      },
      {
        key: "revenue",
        header: "Revenue",
        headerClassName: "text-right",
        className: "text-right",
        cell: (row) => (
          <span className="text-sm font-mono tabular-nums">
            {formatCurrencyFull(Number(row.revenue))}
          </span>
        ),
      },
      {
        key: "cost",
        header: "Cost",
        headerClassName: "text-right",
        className: "text-right",
        cell: (row) => (
          <span className="text-sm font-mono tabular-nums">
            {formatCurrencyFull(Number(row.cost))}
          </span>
        ),
      },
      {
        key: "margin",
        header: "Margin",
        headerClassName: "text-right",
        className: "text-right",
        cell: (row) => {
          const pct = Number(row.marginPct) || 0;
          const isPositive = pct >= 0;
          return (
            <span
              className={cn(
                "text-sm font-mono tabular-nums font-medium",
                isPositive ? "text-status-success-ink" : "text-status-danger-ink",
              )}
            >
              {formatCurrencyFull(Number(row.margin))}
            </span>
          );
        },
      },
      {
        key: "marginPct",
        header: "Margin %",
        className: "w-[160px]",
        cell: (row) => {
          const pct = Number(row.marginPct) || 0;
          const isPositive = pct >= 0;
          return (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isPositive ? "bg-status-success-fill" : "bg-status-danger-fill",
                  )}
                  style={{ width: `${Math.min(Math.abs(pct), 100)}%` }}
                />
              </div>
              <span
                className={cn(
                  "text-xs font-mono tabular-nums w-12 text-right shrink-0",
                  isPositive ? "text-status-success-ink" : "text-status-danger-ink",
                )}
              >
                {pct.toFixed(1)}%
              </span>
            </div>
          );
        },
      },
    ],
    [nameKey],
  );

  return (
    <DataTable
      className="flex-1 min-h-0"
      data={indexedData}
      columns={columns}
      getRowKey={getProfitabilityRowKey}
      minWidth="640px"
    />
  );
}
