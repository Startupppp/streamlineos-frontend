"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { formatQuantity } from "@/features/inventory/components/planning/forecast-format";
import {
  useDriftWatchlist,
  type DriftWatchRow,
} from "@/hooks/api/inventory/replenishment-planning";
import { ForecastDriftEvidenceSheet } from "./forecast-drift-evidence-sheet";
import { toneChipClass } from "./transfer-evidence-panel";

const READ_KEY = "inventory:replenishment:read";
const PAGE_SIZE = 20;

interface EvidenceButtonProps {
  row: DriftWatchRow;
  onOpen: (row: DriftWatchRow) => void;
}

function EvidenceButton({ row, onOpen }: EvidenceButtonProps) {
  function handleClick(): void {
    onOpen(row);
  }
  return (
    <Button variant="outline" size="sm" className="h-7 px-2 text-micro" onClick={handleClick}>
      Evidence ({row.storedVersions})
    </Button>
  );
}

function buildColumns(
  onOpenEvidence: (row: DriftWatchRow) => void,
): DataTableColumn<DriftWatchRow>[] {
  return [
    {
      key: "product",
      header: "Item",
      cell: (row) => (
        <div>
          <TruncatedText text={row.productName} className="text-dense font-medium" />
          <p className="font-mono text-dense text-muted-foreground">{row.variantSku}</p>
        </div>
      ),
    },
    {
      key: "warehouse",
      header: "Site",
      cell: (row) => (
        <span className="text-dense text-muted-foreground">
          {row.warehouseName ?? "Organisation"}
        </span>
      ),
    },
    {
      key: "method",
      header: "Method",
      cell: (row) => (
        <span className="text-dense text-muted-foreground">
          {row.method ?? row.refusalReason ?? "—"}
        </span>
      ),
    },
    {
      key: "mae",
      header: "MAE",
      className: "font-mono tabular-nums text-dense text-right",
      headerClassName: "text-right",
      cell: (row) => (row.mae === null ? "—" : formatQuantity(row.mae)),
    },
    {
      key: "maeRatio",
      header: "Error vs a week",
      className: "text-right",
      headerClassName: "text-right",
      cell: (row) =>
        row.maeRatio === null ? (
          <span className="font-mono text-dense tabular-nums text-muted-foreground">—</span>
        ) : (
          <Badge
            variant="outline"
            className={cn(
              "h-5 px-2 py-0.5 font-mono text-micro tabular-nums",
              toneChipClass(row.breachesThreshold ? "danger" : "success"),
            )}
          >
            {Number(row.maeRatio).toFixed(2)}×
          </Badge>
        ),
    },
    {
      key: "freshness",
      header: "Age",
      cell: (row) => (
        <Badge
          variant="outline"
          className={cn(
            "h-5 px-2 py-0.5 text-micro tabular-nums",
            toneChipClass(row.stale ? "warning" : "neutral"),
          )}
        >
          {row.stale ? `Stale · ${row.ageDays}d` : `${row.ageDays}d`}
        </Badge>
      ),
    },
    {
      key: "coverage",
      header: "Periods",
      className: "font-mono tabular-nums text-dense text-right text-muted-foreground",
      headerClassName: "text-right",
      cell: (row) =>
        row.coverage.censoredPeriods > 0
          ? `${row.coverage.periods} (${row.coverage.censoredPeriods} censored)`
          : String(row.coverage.periods),
    },
    {
      key: "actions",
      header: "",
      className: "w-32 text-right",
      cell: (row) => <EvidenceButton row={row} onOpen={onOpenEvidence} />,
    },
  ];
}

/**
 * C7 — the drift watchlist.
 *
 * Worst error first, so a SKU whose forecast has stopped working appears without
 * anyone suspecting it. "Error vs a week" is MAE against mean weekly demand,
 * which is what makes one threshold meaningful across SKUs selling five a week
 * and five thousand.
 *
 * Nothing on this page writes. Opening the evidence reads the stored versions;
 * it does not regenerate a forecast, because a monitor that changes what it
 * monitors destroys the evidence it exists to preserve.
 */
export function ForecastDriftClient() {
  const canRead = useCan(READ_KEY);
  const [page, setPage] = useState(1);
  const [breachingOnly, setBreachingOnly] = useState(false);
  const [evidenceRow, setEvidenceRow] = useState<DriftWatchRow | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useDriftWatchlist({
    page,
    limit: PAGE_SIZE,
    breachingOnly,
  });

  function handleRetry(): void {
    void refetch();
  }

  function handleScopeChange(value: string): void {
    setBreachingOnly(value === "breaching");
    setPage(1);
  }

  function handleOpenEvidence(row: DriftWatchRow): void {
    setEvidenceRow(row);
    setEvidenceOpen(true);
  }

  if (!canRead) {
    return (
      <PageWrapper title="Forecast drift">
        <NoPermissionState
          permission={READ_KEY}
          title="Drift monitoring is restricted"
          description="Reading forecast accuracy needs replenishment access. This watchlist is not empty — it is closed to you."
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  const summary = data?.summary;
  const items = data?.items ?? [];

  return (
    <PageWrapper
      title="Forecast drift"
      subtitle="Which forecasts have stopped working, how much of the catalogue is covered, and how often a proposal is acted on."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Select value={breachingOnly ? "breaching" : "all"} onValueChange={handleScopeChange}>
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-fit min-w-[180px]")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
              <SelectItem value="all">All tracked SKUs</SelectItem>
              <SelectItem value="breaching">Over the error threshold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load the drift watchlist"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : (
          <>
            <StatCardGrid cols={4}>
              <StatCard
                label="Tracked SKUs"
                value={summary?.tracked ?? 0}
                isLoading={isLoading}
                hint={
                  summary
                    ? `${summary.coverage.percent}% of ${summary.coverage.variantsTotal} variants`
                    : undefined
                }
              />
              <StatCard
                label="Over the threshold"
                value={summary?.breaching ?? 0}
                tone={(summary?.breaching ?? 0) > 0 ? "red" : "default"}
                isLoading={isLoading}
              />
              <StatCard
                label="Stale forecasts"
                value={summary?.stale ?? 0}
                tone={(summary?.stale ?? 0) > 0 ? "amber" : "default"}
                isLoading={isLoading}
                hint="Older than the horizon they speak for"
              />
              <StatCard
                label="Proposals accepted"
                value={summary ? `${summary.proposals.acceptedPercent}%` : "0.00%"}
                isLoading={isLoading}
                hint={
                  summary
                    ? `${summary.proposals.overriddenPercent}% of refusals overridden`
                    : undefined
                }
              />
            </StatCardGrid>

            <DataTable
              data={items}
              columns={buildColumns(handleOpenEvidence)}
              getRowKey={(row) => row.forecastId}
              isLoading={isLoading}
              minWidth="1080px"
              className="min-h-0 flex-1"
              pagination={{
                mode: "server",
                page,
                pageSize: PAGE_SIZE,
                total: data?.total ?? 0,
                onPageChange: setPage,
              }}
              emptyState={
                <InventoryEmptyState
                  illustrationPreset="inventory"
                  title={
                    breachingOnly
                      ? "No forecast is over the threshold"
                      : "No forecasts on record yet"
                  }
                  description={
                    breachingOnly
                      ? "Every tracked forecast's average error is smaller than an average week's demand. Clear the filter to see them all."
                      : "A SKU appears here once a forecast has been recorded for it. Generate one from the forecasting screen."
                  }
                  compact
                />
              }
            />
          </>
        )}
      </div>

      <ForecastDriftEvidenceSheet
        key={evidenceRow?.forecastId ?? "none"}
        open={evidenceOpen}
        onOpenChange={setEvidenceOpen}
        productVariantId={evidenceRow?.productVariantId ?? null}
        productName={evidenceRow?.productName ?? ""}
        variantSku={evidenceRow?.variantSku ?? ""}
        warehouseId={evidenceRow?.warehouseId ?? null}
      />
    </PageWrapper>
  );
}
