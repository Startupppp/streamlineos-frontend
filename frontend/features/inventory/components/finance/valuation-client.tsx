"use client";

import { useState } from "react";
import Link from "next/link";
import { DollarSign, Layers } from "lucide-react";
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
import { ErrorState, AppSheet } from "@/components/shared";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useCan } from "@/hooks/api/access";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import { TruncatedText } from "@/components/ui/truncated-text";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import {
  useValuationReport,
  useValuationLayers,
  type ValuationRow,
} from "@/hooks/api/inventory/valuation";

const SENTINEL = "__all__";

type CostingMethod = ValuationRow["costingMethod"];

const METHOD_LABEL: Record<CostingMethod, string> = {
  FIFO: "FIFO",
  LIFO: "LIFO",
  WEIGHTED_AVG: "Weighted Avg",
  STANDARD: "Standard",
};

const METHOD_BADGE_CLASS: Record<CostingMethod, string> = {
  FIFO: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  LIFO: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30",
  WEIGHTED_AVG: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  STANDARD: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
};

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type ValuationLayerRow = {
  id: number;
  qty: number;
  unitCost: number;
  remainingQty: number;
  receivedAt: string;
};

const layerColumns: DataTableColumn<ValuationLayerRow>[] = [
  {
    key: "receivedAt",
    header: "Received",
    className: "text-muted-foreground",
    cell: (row) => formatDate(row.receivedAt),
  },
  {
    key: "qty",
    header: "Qty",
    className: "tabular-nums",
    cell: (row) => row.qty,
  },
  {
    key: "remainingQty",
    header: "Remaining",
    className: "tabular-nums",
    cell: (row) => row.remainingQty,
  },
  {
    key: "unitCost",
    header: "Unit Cost",
    className: "tabular-nums",
    cell: (row) => formatCents(row.unitCost),
  },
];

function LayersSheet({
  variantId,
  open,
  onClose,
}: {
  variantId: number;
  open: boolean;
  onClose: () => void;
}) {
  const [layersPage, setLayersPage] = useState(1);
  const { data, isLoading, error } = useValuationLayers(variantId, layersPage);
  const layers = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const layersTotal = data?.total ?? 0;

  function handleOpenChange(v: boolean): void {
    if (!v) onClose();
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Cost Layers"
      description="FIFO/LIFO cost layers for this variant."
    >
      <div className="px-6 py-4">
        {error ? (
          <ErrorState compact />
        ) : !isLoading && layers.length === 0 ? (
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
            getRowKey={(row) => row.id}
            isLoading={isLoading}
            pagination={
              totalPages > 1
                ? { mode: "server", page: layersPage, pageSize: 20, total: layersTotal, onPageChange: setLayersPage }
                : undefined
            }
            minWidth="400px"
          />
        )}
      </div>
    </AppSheet>
  );
}

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
  onViewLayers: (variantId: number) => void,
): DataTableColumn<ValuationRow>[] {
  function handleViewLayersFor(row: ValuationRow): void {
    onViewLayers(row.variantId);
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
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-dense font-medium ${METHOD_BADGE_CLASS[row.costingMethod]}`}>
          {METHOD_LABEL[row.costingMethod]}
        </span>
      ),
    },
    {
      key: "onHandQty",
      header: "On Hand",
      className: "tabular-nums",
      cell: (row) => row.onHandQty.toLocaleString(),
    },
    {
      key: "unitCostBasis",
      header: "Unit Cost",
      className: "tabular-nums text-muted-foreground",
      cell: (row) => formatCents(row.unitCostBasis),
    },
    {
      key: "totalValue",
      header: "Total Value",
      className: "tabular-nums font-semibold",
      cell: (row) => formatCents(row.totalValue),
    },
    {
      key: "warehouse",
      header: "Warehouse",
      className: "text-muted-foreground",
      cell: (row) => <TruncatedText text={row.warehouseName ?? "—"} className="text-sm text-muted-foreground" />,
    },
    {
      key: "actions",
      header: "",
      cell: (row) => <ViewLayersButton onClick={() => handleViewLayersFor(row)} />,
    },
  ];
}

export function ValuationClient() {
  const canRead = useCan("inventory:valuation:read");
  const [warehouseFilter, setWarehouseFilter] = useState<number | undefined>(undefined);
  const [selectedVariantId, setSelectedVariantId] = useState<number>(0);
  const [layersOpen, setLayersOpen] = useState(false);

  const { data: warehouses = [] } = useWarehouses();
  const { data, isLoading, error, refetch } = useValuationReport({ warehouseId: warehouseFilter });

  const rows = data?.rows ?? [];
  const totalValue = data?.totalValue ?? 0;
  const byMethod = data?.byMethod ?? [];

  function handleViewLayers(variantId: number): void {
    setSelectedVariantId(variantId);
    setLayersOpen(true);
  }

  function handleCloseLayersSheet(): void {
    setLayersOpen(false);
  }

  function handleWarehouseChange(val: string): void {
    setWarehouseFilter(val === SENTINEL ? undefined : Number(val));
  }

  function handleRetry(): void {
    void refetch();
  }

  if (!canRead) {
    return (
      <PageWrapper title="Inventory Valuation">
        <InventoryEmptyState
          illustrationPreset="security"
          title="Access restricted"
          description="You don't have permission to view inventory valuation."
          className="flex-1 h-full"
        />
      </PageWrapper>
    );
  }

  function getMethodValue(method: CostingMethod): string {
    const entry = byMethod.find((b) => b.method === method);
    return entry ? formatCents(entry.value) : formatCents(0);
  }

  const columns = buildValuationColumns(handleViewLayers);

  return (
    <PageWrapper
      title="Inventory Valuation"
      subtitle="Total stock value by costing method."
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
        <StatCardGrid cols={4}>
          <StatCard
            label="Total Value"
            value={isLoading ? "—" : formatCents(totalValue)}
            icon={DollarSign}
            tone="blue"
            isLoading={isLoading}
          />
          <StatCard
            label="FIFO Value"
            value={isLoading ? "—" : getMethodValue("FIFO")}
            icon={Layers}
            tone="default"
            isLoading={isLoading}
          />
          <StatCard
            label="Weighted Avg Value"
            value={isLoading ? "—" : getMethodValue("WEIGHTED_AVG")}
            icon={Layers}
            tone="amber"
            isLoading={isLoading}
          />
          <StatCard
            label="Standard Value"
            value={isLoading ? "—" : getMethodValue("STANDARD")}
            icon={Layers}
            tone="emerald"
            isLoading={isLoading}
          />
        </StatCardGrid>

        {error ? (
          <ErrorState onRetry={handleRetry} />
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
            getRowKey={(row) => `${row.variantId}-${row.warehouseId ?? "all"}`}
            isLoading={isLoading}
            pagination={{ pageSize: 25 }}
            minWidth="760px"
          />
        )}
      </div>

      <LayersSheet
        variantId={selectedVariantId}
        open={layersOpen}
        onClose={handleCloseLayersSheet}
      />
    </PageWrapper>
  );
}
