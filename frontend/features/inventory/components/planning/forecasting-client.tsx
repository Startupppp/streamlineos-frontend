"use client";

import { useState, memo } from "react";
import { Search } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonTable, ErrorState, DataTablePagination } from "@/components/shared";
import { useForecasting, type ForecastRow } from "@/hooks/api/inventory/planning";

type StockoutRisk = ForecastRow["stockoutRisk"];

const RISK_BADGE: Record<StockoutRisk, { label: string; className: string }> = {
  HIGH: { label: "High", className: "bg-red-50 text-red-700 border-red-200" },
  MEDIUM: { label: "Medium", className: "bg-amber-50 text-amber-700 border-amber-200" },
  LOW: { label: "Low", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

function getProjectedQty(row: ForecastRow, week: number): string {
  const found = row.projection.find((p) => p.week === week);
  if (!found) return "—";
  return found.projectedQty.toLocaleString();
}

interface ForecastTableRowProps {
  row: ForecastRow;
}

const ForecastTableRow = memo(function ForecastTableRow({ row }: ForecastTableRowProps) {
  const risk = RISK_BADGE[row.stockoutRisk];
  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-foreground truncate max-w-[180px]">{row.productName}</p>
        <p className="text-xs text-muted-foreground font-mono">{row.variantSku}</p>
      </td>
      <td className="px-4 py-3 text-sm tabular-nums">
        {row.weeklyDemand != null ? row.weeklyDemand.toLocaleString() : "—"}
      </td>
      <td className="px-4 py-3 text-sm tabular-nums">{getProjectedQty(row, 1)}</td>
      <td className="px-4 py-3 text-sm tabular-nums">{getProjectedQty(row, 2)}</td>
      <td className="px-4 py-3 text-sm tabular-nums">{getProjectedQty(row, 3)}</td>
      <td className="px-4 py-3 text-sm tabular-nums">{getProjectedQty(row, 4)}</td>
      <td className="px-4 py-3 text-sm tabular-nums">{row.currentStock.toLocaleString()}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium ${risk.className}`}
        >
          {risk.label}
        </span>
      </td>
    </tr>
  );
});

export function ForecastingClient() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useForecasting({ search: search || undefined, page });

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setSearch(e.target.value);
    setPage(1);
  }

  function handleRetry(): void {
    void refetch();
  }

  return (
    <PageWrapper
      title="Demand Forecasting"
      subtitle="SMA-based demand projections and stockout risk assessment."
      filters={
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={handleSearchChange}
            className="pl-8 h-8 text-sm"
          />
        </div>
      }
    >
      {isLoading ? (
        <SkeletonTable rows={6} columns={8} />
      ) : error ? (
        <ErrorState onRetry={handleRetry} />
      ) : rows.length === 0 ? (
        <EmptyState
          illustrationPreset="chart"
          title="No forecast data available"
          description="Sales history is needed to generate forecasts."
          className="flex-1 h-full"
        />
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Product / SKU</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Weekly Demand</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Week 1</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Week 2</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Week 3</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Week 4</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Current Stock</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Stockout Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <ForecastTableRow key={row.variantId} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <DataTablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={20}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </PageWrapper>
  );
}
