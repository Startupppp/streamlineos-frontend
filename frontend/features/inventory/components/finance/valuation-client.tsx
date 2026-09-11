"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, DollarSign, Layers } from "lucide-react";
import { EyeIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useCan } from "@/hooks/api/access";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import { TruncatedText } from "@/components/ui/truncated-text";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { formatMoney, type MoneyDisplay } from "@/lib/format-utils";
import { formatCalendarDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { formatQuantity } from "@/features/inventory/components/planning/forecast-format";
import { useValuationReport, type ValuationRow } from "@/hooks/api/inventory/valuation";
import { ValuationEvidenceSheet } from "./valuation-evidence-sheet";
import { COSTING_METHOD_BADGE_CLASS, costingMethodLabel } from "./costing-method";

const SENTINEL = "__all__";
const PAGE_SIZE = 25;

function ViewLayersButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={onClick} {...hoverHandlers}>
      <EyeIcon ref={iconRef} size={14} aria-hidden="true" />
      Layers
    </Button>
  );
}

function buildValuationColumns(
  display: MoneyDisplay,
  onViewLayers: (variantId: number) => void,
): DataTableColumn<ValuationRow>[] {
  function handleViewLayersFor(row: ValuationRow): void {
    onViewLayers(row.productVariantId);
  }

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
      key: "costingMethod",
      header: "Costing Method",
      cell: (row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md border text-dense font-medium ${COSTING_METHOD_BADGE_CLASS[row.costingMethod] ?? "bg-muted text-muted-foreground border-border"}`}
        >
          {costingMethodLabel(row.costingMethod)}
        </span>
      ),
    },
    {
      key: "onHand",
      header: "On Hand",
      className: "tabular-nums text-right",
      headerClassName: "text-right",
      cell: (row) => formatQuantity(row.onHand),
    },
    {
      key: "unitCostBasis",
      header: "Unit Cost",
      className: "tabular-nums text-right text-muted-foreground",
      headerClassName: "text-right",
      cell: (row) => formatMoney(row.unitCostBasis, display),
    },
    {
      key: "value",
      header: "Total Value",
      className: "tabular-nums text-right font-semibold",
      headerClassName: "text-right",
      cell: (row) => formatMoney(row.value, display),
    },
    {
      key: "layerCount",
      header: "Layers",
      className: "tabular-nums text-right text-muted-foreground",
      headerClassName: "text-right",
      cell: (row) => String(row.layerCount),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => <ViewLayersButton onClick={() => handleViewLayersFor(row)} />,
    },
  ];
}

export function ValuationClient() {
  const canView = useCan("inventory:valuation:read");
  const display = useOrgDisplay();
  const [warehouseFilter, setWarehouseFilter] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<number>(0);
  const [layersOpen, setLayersOpen] = useState(false);

  const { data: warehouses = [] } = useWarehouses();
  const { data, isLoading, error, refetch } = useValuationReport({
    warehouseId: warehouseFilter,
    page,
    limit: PAGE_SIZE,
  });

  const rows = data?.items ?? [];

  function handleViewLayers(variantId: number): void {
    setSelectedVariantId(variantId);
    setLayersOpen(true);
  }

  function handleCloseLayersSheet(): void {
    setLayersOpen(false);
  }

  function handleWarehouseChange(val: string): void {
    setWarehouseFilter(val === SENTINEL ? undefined : Number(val));
    setPage(1);
  }

  function handleRetry(): void {
    void refetch();
  }

  const columns = buildValuationColumns(display, handleViewLayers);

  // G8. Denied is not empty. Placed after every hook, not at the top of
  // the component: an early return above a useState or useQuery makes the
  // hook order depend on a permission, which React forbids and which only
  // shows up for the user who lacks the key.
  if (!canView) {
    return (
      <PageWrapper title="Inventory Valuation">
        <NoPermissionState permission="inventory:valuation:read" className="flex-1" />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Inventory Valuation"
      subtitle="Stock value as at the quoted date, with the layers behind each figure."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/inventory/costing">Costing Setup</Link>
        </Button>
      }
      filters={
        <Select
          value={warehouseFilter ? String(warehouseFilter) : SENTINEL}
          onValueChange={handleWarehouseChange}
        >
          <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-48 text-sm")}>
            <SelectValue placeholder="All warehouses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SENTINEL}>All warehouses</SelectItem>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={String(w.id)}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <StatCardGrid cols={3}>
          <StatCard
            label="Total Value"
            value={data ? formatMoney(data.totalValue, display) : "—"}
            icon={DollarSign}
            tone="blue"
            isLoading={isLoading}
          />
          <StatCard
            label="Total On Hand"
            value={data ? formatQuantity(data.totalOnHand) : "—"}
            icon={Layers}
            tone="default"
            isLoading={isLoading}
          />
          <StatCard
            label="Valued As At"
            value={data ? formatCalendarDate(data.grain.asOfDate) : "—"}
            hint={data?.grain.live ? "Live projection" : (data?.grain.period?.name ?? undefined)}
            icon={CalendarClock}
            tone="amber"
            isLoading={isLoading}
          />
        </StatCardGrid>

        {error ? (
          <ErrorState description={getErrorMessage(error)} onRetry={handleRetry} />
        ) : !isLoading && rows.length === 0 ? (
          <InventoryEmptyState
            illustrationPreset="inventory"
            title="No valuation data"
            description="Stock valuation data will appear here once inventory is received."
            className="flex-1 h-full"
          />
        ) : (
          <DataTable
            data={rows}
            columns={columns}
            className="flex-1 min-h-0"
            getRowKey={(row) => row.productVariantId}
            isLoading={isLoading}
            pagination={{
              mode: "server",
              page,
              pageSize: PAGE_SIZE,
              total: data?.total ?? 0,
              onPageChange: setPage,
            }}
            minWidth="760px"
          />
        )}
      </div>

      <ValuationEvidenceSheet
        variantId={selectedVariantId}
        open={layersOpen}
        onClose={handleCloseLayersSheet}
      />
    </PageWrapper>
  );
}
