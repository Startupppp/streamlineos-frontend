"use client";

import { useState } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState } from "@/components/shared";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { useForecasting, type ForecastRow } from "@/hooks/api/inventory/planning";

type StockoutRisk = ForecastRow["stockoutRisk"];

type RiskBadgeEntry = { label: string; className: string };

const RISK_BADGE: Record<StockoutRisk | "NONE", RiskBadgeEntry> = {
  HIGH: { label: "High", className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30" },
  MEDIUM: { label: "Medium", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30" },
  LOW: { label: "Low", className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30" },
  NONE: { label: "None", className: "bg-muted text-muted-foreground border-border" },
};

function getProjectedQty(row: ForecastRow, week: number): string {
  const found = row.projection.find((p) => p.week === week);
  if (!found) return "—";
  return found.projectedQty.toLocaleString();
}

function getRiskBadge(risk: string): RiskBadgeEntry {
  return (RISK_BADGE as Record<string, RiskBadgeEntry>)[risk] ?? RISK_BADGE.NONE;
}

const columns: DataTableColumn<ForecastRow>[] = [
  {
    key: "product",
    header: "Product / SKU",
    cell: (row) => (
      <div>
        <p className="text-sm font-medium text-foreground truncate max-w-[180px]">{row.productName}</p>
        <p className="text-xs text-muted-foreground font-mono">{row.variantSku}</p>
      </div>
    ),
  },
  {
    key: "weeklyDemand",
    header: "Weekly Demand",
    className: "tabular-nums",
    cell: (row) => row.weeklyDemand != null ? row.weeklyDemand.toLocaleString() : "—",
  },
  {
    key: "week1",
    header: "Week 1",
    className: "tabular-nums",
    cell: (row) => getProjectedQty(row, 1),
  },
  {
    key: "week2",
    header: "Week 2",
    className: "tabular-nums",
    cell: (row) => getProjectedQty(row, 2),
  },
  {
    key: "week3",
    header: "Week 3",
    className: "tabular-nums",
    cell: (row) => getProjectedQty(row, 3),
  },
  {
    key: "week4",
    header: "Week 4",
    className: "tabular-nums",
    cell: (row) => getProjectedQty(row, 4),
  },
  {
    key: "currentStock",
    header: "Current Stock",
    className: "tabular-nums",
    cell: (row) => row.currentStock.toLocaleString(),
  },
  {
    key: "stockoutRisk",
    header: "Stockout Risk",
    cell: (row) => {
      const badge = getRiskBadge(row.stockoutRisk);
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium ${badge.className}`}>
          {badge.label}
        </span>
      );
    },
  },
];

export function ForecastingClient() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useForecasting({ search: debouncedSearch.trim() || undefined, page });

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;

  function handleSearchChange(value: string) {
    setSearch(value);
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
        <div className="min-w-0 w-64">
          <SearchInput placeholder="Search products..." value={search} onValueChange={handleSearchChange} />
        </div>
      }
    >
      {error ? (
        <ErrorState onRetry={handleRetry} />
      ) : !isLoading && rows.length === 0 ? (
        <InventoryEmptyState
          illustrationPreset="chart"
          title="No forecast data available"
          description="Sales history is needed to generate forecasts."
          className="flex-1 h-full"
        />
      ) : (
        <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
          <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
            <DataTable
              data={rows}
              columns={columns}
              getRowKey={(row) => row.variantId}
              isLoading={isLoading}
              pagination={{ mode: "server", page, pageSize: 25, total, onPageChange: setPage }}
              minWidth="800px"
            />
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
}
