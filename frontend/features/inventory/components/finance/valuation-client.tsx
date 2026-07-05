"use client";

import { useState } from "react";
import Link from "next/link";
import { DollarSign, Layers, Eye } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkeletonTable, ErrorState, AppSheet } from "@/components/shared";
import { DataTablePagination } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";
import { useValuationReport, useValuationLayers, type ValuationRow } from "@/hooks/api/inventory/valuation";

const SENTINEL = "__all__";

type CostingMethod = ValuationRow["costingMethod"];

const METHOD_LABEL: Record<CostingMethod, string> = {
  FIFO: "FIFO",
  LIFO: "LIFO",
  WEIGHTED_AVG: "Weighted Avg",
  STANDARD: "Standard",
};

const METHOD_BADGE_CLASS: Record<CostingMethod, string> = {
  FIFO: "bg-blue-50 text-blue-700 border-blue-200",
  LIFO: "bg-violet-50 text-violet-700 border-violet-200",
  WEIGHTED_AVG: "bg-amber-50 text-amber-700 border-amber-200",
  STANDARD: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface ValuationRowProps {
  row: ValuationRow;
  onViewLayers: (variantId: number) => void;
}

function ValuationTableRow({ row, onViewLayers }: ValuationRowProps) {
  function handleViewLayers(): void {
    onViewLayers(row.variantId);
  }

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-foreground truncate max-w-[180px]">{row.productName}</p>
        <p className="text-xs text-muted-foreground font-mono">{row.variantSku}</p>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium ${METHOD_BADGE_CLASS[row.costingMethod]}`}>
          {METHOD_LABEL[row.costingMethod]}
        </span>
      </td>
      <td className="px-4 py-3 text-sm tabular-nums">{row.onHandQty.toLocaleString()}</td>
      <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{formatCents(row.unitCostBasis)}</td>
      <td className="px-4 py-3 text-sm tabular-nums font-semibold">{formatCents(row.totalValue)}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{row.warehouseName ?? "—"}</td>
      <td className="px-4 py-3">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleViewLayers}>
          <Eye className="h-3.5 w-3.5" />
          Layers
        </Button>
      </td>
    </tr>
  );
}

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

  return (
    <AppSheet
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title="Cost Layers"
      description="FIFO/LIFO cost layers for this variant."
    >
      <div className="px-6 py-4">
        {isLoading ? (
          <SkeletonTable rows={5} columns={4} />
        ) : error ? (
          <ErrorState compact />
        ) : layers.length === 0 ? (
          <EmptyState
            illustrationPreset="inventory"
            title="No cost layers"
            description="No stock layers recorded for this variant."
            compact
          />
        ) : (
          <>
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Received</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Qty</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Remaining</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Unit Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {layers.map((layer) => (
                    <tr key={layer.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(layer.receivedAt)}</td>
                      <td className="px-3 py-2 text-sm tabular-nums">{layer.qty}</td>
                      <td className="px-3 py-2 text-sm tabular-nums">{layer.remainingQty}</td>
                      <td className="px-3 py-2 text-sm tabular-nums">{formatCents(layer.unitCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(data?.totalPages ?? 1) > 1 && (
              <DataTablePagination
                page={layersPage}
                totalPages={data?.totalPages ?? 1}
                total={data?.total ?? 0}
                limit={20}
                onPageChange={setLayersPage}
              />
            )}
          </>
        )}
      </div>
    </AppSheet>
  );
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
        <EmptyState
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
          <SelectTrigger className="h-8 w-48 text-sm">
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
      <StatCardGrid cols={4} className="mb-4">
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

      {isLoading ? (
        <SkeletonTable rows={6} columns={7} />
      ) : error ? (
        <ErrorState onRetry={handleRetry} />
      ) : rows.length === 0 ? (
        <EmptyState
          illustrationPreset="inventory"
          title="No valuation data"
          description="Stock valuation data will appear here once inventory is received."
          className="flex-1 h-full"
        />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Product / SKU</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Costing Method</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">On Hand</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Unit Cost</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Total Value</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Warehouse</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <ValuationTableRow
                    key={`${row.variantId}-${row.warehouseId ?? "all"}`}
                    row={row}
                    onViewLayers={handleViewLayers}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <LayersSheet
        variantId={selectedVariantId}
        open={layersOpen}
        onClose={handleCloseLayersSheet}
      />
    </PageWrapper>
  );
}
