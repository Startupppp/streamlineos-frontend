"use client";

import { useState } from "react";
import { AppSheet, ErrorState } from "@/components/shared";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { formatMoney } from "@/lib/format-utils";
import { formatCalendarDate, formatShortDate } from "@/lib/date-utils";
import { useOrgDisplay } from "@/hooks/api/org-display";
import {
  useValuationConsumptions,
  useValuationLayers,
  useValuationPeriods,
  type ValuationConsumption,
  type ValuationLayer,
} from "@/hooks/api/inventory/valuation";

interface ValuationEvidenceSheetProps {
  variantId: number;
  open: boolean;
  onClose: () => void;
}

const PAGE_SIZE = 20;
const ALL_PERIODS = "__all__";

/**
 * The two halves of a valuation figure: what came in, and what each issue took
 * back out of it.
 *
 * Layers alone answer "what is this worth"; only the consumption lines answer
 * "why is cost of goods sold this number", because each names the layer it drew
 * from and the unit cost it drew at. `GET /inventory/valuation/consumptions` and
 * `GET /inventory/valuation/periods` both existed on `inventory:valuation:read`
 * with no caller, so the evidence stopped at the receipt.
 *
 * Every quantity and money figure here is a `numeric(18,4)` string in the
 * organisation's own currency. It is never divided and never parsed.
 */
export function ValuationEvidenceSheet({ variantId, open, onClose }: ValuationEvidenceSheetProps) {
  const display = useOrgDisplay();
  const [tab, setTab] = useState("layers");
  const [layersPage, setLayersPage] = useState(1);
  const [consumptionPage, setConsumptionPage] = useState(1);
  const [periodId, setPeriodId] = useState<string>(ALL_PERIODS);

  const layersQuery = useValuationLayers(variantId, layersPage);
  const periodsQuery = useValuationPeriods();
  const consumptionsQuery = useValuationConsumptions({
    variantId,
    ...(periodId === ALL_PERIODS ? {} : { periodId }),
    page: consumptionPage,
    limit: PAGE_SIZE,
  });

  const layers = layersQuery.data?.items ?? [];
  const consumptions = consumptionsQuery.data?.items ?? [];
  const periods = periodsQuery.data?.installed ? (periodsQuery.data.items ?? []) : [];
  const window = consumptionsQuery.data?.window;

  function handleOpenChange(next: boolean): void {
    if (!next) onClose();
  }

  function handlePeriodChange(next: string): void {
    setPeriodId(next);
    setConsumptionPage(1);
  }

  function handleLayersRetry(): void {
    void layersQuery.refetch();
  }

  function handleConsumptionsRetry(): void {
    void consumptionsQuery.refetch();
  }

  const layerColumns: DataTableColumn<ValuationLayer>[] = [
    {
      key: "createdAt",
      header: "Received",
      className: "text-muted-foreground",
      cell: (row) => formatShortDate(row.createdAt),
    },
    {
      key: "quantity",
      header: "Qty in",
      className: "tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) => row.quantity,
    },
    {
      key: "remainingQuantityAsAt",
      header: "Remaining",
      className: "tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) => row.remainingQuantityAsAt,
    },
    {
      key: "unitCost",
      header: "Unit cost",
      className: "font-mono tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) => formatMoney(row.unitCost, display),
    },
    {
      key: "remainingValueAsAt",
      header: "Remaining value",
      className: "font-mono tabular-nums text-right font-medium",
      headerClassName: "text-right",
      cell: (row) => formatMoney(row.remainingValueAsAt, display),
    },
  ];

  const consumptionColumns: DataTableColumn<ValuationConsumption>[] = [
    {
      key: "postingDate",
      header: "Posted",
      className: "text-muted-foreground",
      cell: (row) => formatCalendarDate(row.postingDate),
    },
    {
      key: "movement",
      header: "Movement",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{row.transactionType}</p>
          <p className="truncate font-mono text-dense text-muted-foreground">
            {row.referenceType ? `${row.referenceType} ${row.referenceId ?? ""}`.trim() : "—"}
          </p>
        </div>
      ),
    },
    {
      key: "valuationLayerId",
      header: "From layer",
      className: "font-mono tabular-nums",
      cell: (row) => `#${row.valuationLayerId}`,
    },
    {
      key: "quantity",
      header: "Qty taken",
      className: "tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) => row.quantity,
    },
    {
      key: "unitCost",
      header: "At",
      className: "font-mono tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) => formatMoney(row.unitCost, display),
    },
    {
      key: "totalCost",
      header: "Cost",
      className: "font-mono tabular-nums text-right font-medium",
      headerClassName: "text-right",
      cell: (row) => formatMoney(row.totalCost, display),
    },
  ];

  return (
    <AppSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Cost evidence"
      description="The layers this variant's value stands on, and what each issue drew out of them."
      className="sm:max-w-2xl"
    >
      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-3">
        <TabsList>
          <TabsTrigger value="layers">Layers</TabsTrigger>
          <TabsTrigger value="consumption">Consumption</TabsTrigger>
        </TabsList>

        <TabsContent value="layers" className="mt-0">
          {layersQuery.isError ? (
            <ErrorState
              compact
              title="Couldn't load cost layers"
              onRetry={handleLayersRetry}
            />
          ) : !layersQuery.isLoading && layers.length === 0 ? (
            <InventoryEmptyState
              illustrationPreset="inventory"
              title="No cost layers"
              description="No stock layers recorded for this variant."
              compact
            />
          ) : (
            <DataTable
              data={layers}
              columns={layerColumns}
              getRowKey={(row) => row.layerId}
              isLoading={layersQuery.isLoading}
              minWidth="620px"
              pagination={{
                mode: "server",
                page: layersPage,
                pageSize: PAGE_SIZE,
                total: layersQuery.data?.total ?? 0,
                onPageChange: setLayersPage,
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="consumption" className="mt-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-label text-muted-foreground">
              {window ? `${formatCalendarDate(window.fromDate)} — ${formatCalendarDate(window.toDate)}` : null}
            </p>
            {periods.length > 0 ? (
              <Select value={periodId} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="This month" />
                </SelectTrigger>
                <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                  <SelectItem value={ALL_PERIODS}>This month</SelectItem>
                  {periods.map((period) => (
                    <SelectItem key={period.periodId} value={String(period.periodId)}>
                      {period.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>

          {consumptionsQuery.isError ? (
            <ErrorState
              compact
              title="Couldn't load consumption lines"
              onRetry={handleConsumptionsRetry}
            />
          ) : !consumptionsQuery.isLoading && consumptions.length === 0 ? (
            <InventoryEmptyState
              illustrationPreset="inventory"
              title="Nothing drawn in this window"
              description="Issues consume layers oldest first. Nothing left this variant's stock in the period shown."
              compact
            />
          ) : (
            <DataTable
              data={consumptions}
              columns={consumptionColumns}
              getRowKey={(row) => row.consumptionId}
              isLoading={consumptionsQuery.isLoading}
              minWidth="760px"
              pagination={{
                mode: "server",
                page: consumptionPage,
                pageSize: PAGE_SIZE,
                total: consumptionsQuery.data?.total ?? 0,
                onPageChange: setConsumptionPage,
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </AppSheet>
  );
}
