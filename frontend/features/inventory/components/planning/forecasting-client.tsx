"use client";

import { useState } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { useCan } from "@/hooks/api/access";
import { useForecasting, type ForecastRow } from "@/hooks/api/inventory/planning";
import { ReplenishmentSimulatorSheet } from "./replenishment-simulator-sheet";

type StockoutRisk = ForecastRow["stockoutRisk"];

type RiskBadgeEntry = { label: string; className: string };

const RISK_BADGE: Record<StockoutRisk | "NONE", RiskBadgeEntry> = {
  HIGH: { label: "High", className: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule" },
  MEDIUM: { label: "Medium", className: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule" },
  LOW: { label: "Low", className: "bg-status-success-surface text-status-success-ink border-status-success-rule" },
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

interface SimulateButtonProps {
  row: ForecastRow;
  onSimulate: (row: ForecastRow) => void;
}

function SimulateButton({ row, onSimulate }: SimulateButtonProps) {
  function handleClick(): void {
    onSimulate(row);
  }

  return (
    <Button variant="outline" size="sm" className="h-7 px-2 text-micro" onClick={handleClick}>
      Simulate
    </Button>
  );
}

function buildColumns(
  onSimulate: (row: ForecastRow) => void,
): DataTableColumn<ForecastRow>[] {
  return [
    {
      key: "product",
      header: "Product / SKU",
      cell: (row) => (
        <div>
          <TruncatedText text={row.productName} className="text-sm font-medium text-foreground" />
          <p className="text-xs text-muted-foreground font-mono">{row.variantSku}</p>
        </div>
      ),
    },
    {
      key: "weeklyDemand",
      header: "Weekly Demand",
      className: "tabular-nums",
      cell: (row) => (row.weeklyDemand != null ? row.weeklyDemand.toLocaleString() : "—"),
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
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md border text-dense font-medium ${badge.className}`}
          >
            {badge.label}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      className: "w-24 text-right",
      cell: (row) => <SimulateButton row={row} onSimulate={onSimulate} />,
    },
  ];
}

export function ForecastingClient() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [simulatorRow, setSimulatorRow] = useState<ForecastRow | null>(null);
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  const canView = useCan("inventory:reports:read");
  const { data, isLoading, error, refetch } = useForecasting({
    search: debouncedSearch.trim() || undefined,
    page,
  });

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;

  function handleSearchChange(value: string): void {
    setSearch(value);
    setPage(1);
  }

  function handleRetry(): void {
    void refetch();
  }

  function handleSimulate(row: ForecastRow): void {
    setSimulatorRow(row);
    setSimulatorOpen(true);
  }

  const columns = buildColumns(handleSimulate);

  return (
    <PageWrapper
      title="Demand Forecasting"
      subtitle="Projected demand and stockout risk. Simulate a SKU to see what a change in demand, lead time or service level does to its buffer."
      filters={
        canView ? (
          <div className={FILTER_TOOLBAR_ROW}>
            <SearchInput
              className="min-w-0 flex-1"
              placeholder="Search products..."
              value={search}
              onValueChange={handleSearchChange}
            />
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-1 min-h-0 flex-col">
        {!canView ? (
          <NoPermissionState
            permission="inventory:reports:read"
            title="Forecasting is restricted"
            description="Demand forecasts need inventory report access. This table is not empty — it is closed to you."
            className="flex-1"
          />
        ) : error ? (
          <ErrorState onRetry={handleRetry} className="flex-1" />
        ) : !isLoading && rows.length === 0 ? (
          <InventoryEmptyState
            illustrationPreset="chart"
            title="No forecast data available"
            description="Sales history is needed to generate forecasts."
            className="flex-1 h-full"
          />
        ) : (
          <DataTable
            data={rows}
            columns={columns}
            className="flex-1 min-h-0"
            getRowKey={(row) => row.variantId}
            isLoading={isLoading}
            pagination={{ mode: "server", page, pageSize: 25, total, onPageChange: setPage }}
            minWidth="900px"
          />
        )}
      </div>

      <ReplenishmentSimulatorSheet
        key={simulatorRow?.variantId ?? "none"}
        open={simulatorOpen}
        onOpenChange={setSimulatorOpen}
        productVariantId={simulatorRow?.variantId ?? null}
        productName={simulatorRow?.productName ?? ""}
        variantSku={simulatorRow?.variantSku ?? ""}
      />
    </PageWrapper>
  );
}
