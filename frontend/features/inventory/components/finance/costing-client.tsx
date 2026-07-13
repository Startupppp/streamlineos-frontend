"use client";

import { useState } from "react";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import Link from "next/link";
import { Lock, Search } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ErrorState } from "@/components/shared";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { useCostingProducts, type CostingProductRow } from "@/hooks/api/inventory/valuation";

type CostingMethod = CostingProductRow["costingMethod"];

const METHOD_LABEL: Record<CostingMethod, string> = {
  FIFO: "FIFO",
  LIFO: "LIFO",
  WEIGHTED_AVG: "Weighted Avg",
  STANDARD: "Standard",
};

const METHOD_BADGE_CLASS: Record<CostingMethod, string> = {
  FIFO: "bg-blue-50 text-blue-700 border-blue-200",
  LIFO: "bg-sky-50 text-sky-700 border-sky-200",
  WEIGHTED_AVG: "bg-amber-50 text-amber-700 border-amber-200",
  STANDARD: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function formatCents(cents: number | null): string {
  if (cents === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

const METHOD_EXPLANATIONS: { method: CostingMethod; label: string; description: string }[] = [
  {
    method: "FIFO",
    label: "FIFO",
    description: "First In, First Out — oldest inventory cost is used first when goods are sold.",
  },
  {
    method: "LIFO",
    label: "LIFO",
    description: "Last In, First Out — newest inventory cost is used first when goods are sold.",
  },
  {
    method: "WEIGHTED_AVG",
    label: "Weighted Avg",
    description: "Running weighted average cost recalculated after each receipt.",
  },
  {
    method: "STANDARD",
    label: "Standard Cost",
    description: "Fixed predetermined cost per unit; variances tracked separately.",
  },
];

function CostingGuidanceCard() {
  return (
    <Card className="mb-4">
      <CardContent className="pt-4 pb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Costing Methods
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {METHOD_EXPLANATIONS.map((m) => (
            <div key={m.method} className="space-y-0.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium ${METHOD_BADGE_CLASS[m.method]}`}>
                {m.label}
              </span>
              <p className="text-xs text-muted-foreground leading-snug">{m.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const columns: DataTableColumn<CostingProductRow>[] = [
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
    key: "costingMethod",
    header: "Costing Method",
    cell: (row) => (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium ${METHOD_BADGE_CLASS[row.costingMethod]}`}>
        {METHOD_LABEL[row.costingMethod]}
      </span>
    ),
  },
  {
    key: "standardCost",
    header: "Standard Cost",
    className: "tabular-nums text-muted-foreground",
    cell: (row) =>
      row.costingMethod === "STANDARD" && !row.isLocked
        ? formatCents(row.standardCost)
        : row.standardCost != null
          ? <span className="text-foreground">{formatCents(row.standardCost)}</span>
          : "—",
  },
  {
    key: "averageCost",
    header: "Average Cost",
    className: "tabular-nums text-muted-foreground",
    cell: (row) => formatCents(row.averageCost),
  },
  {
    key: "onHandQty",
    header: "On Hand",
    className: "tabular-nums",
    cell: (row) => row.onHandQty.toLocaleString(),
  },
  {
    key: "locked",
    header: "",
    headerClassName: "w-10",
    cell: (row) =>
      row.isLocked ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label="Method locked while stock exists" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Method locked while stock exists</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null,
  },
];

export function CostingClient() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useCostingProducts({
    search: debouncedSearch.trim() || undefined,
    page,
  });

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setSearch(e.target.value);
    setPage(1);
  }

  function handleRetry(): void {
    void refetch();
  }

  return (
    <PageWrapper
      title="Costing Setup"
      subtitle="Manage costing methods per product. Methods are locked while stock exists."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/inventory/valuation">View Valuation</Link>
        </Button>
      }
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
      <CostingGuidanceCard />

      {error ? (
        <ErrorState onRetry={handleRetry} />
      ) : !isLoading && rows.length === 0 ? (
        <InventoryEmptyState
          illustrationPreset="inventory"
          title="No products found"
          description={search ? "No products match your search." : "Add products to configure costing methods."}
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
              pagination={{ mode: "server", page, pageSize: 20, total, onPageChange: setPage }}
              minWidth="700px"
            />
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
}
