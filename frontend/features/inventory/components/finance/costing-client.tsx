"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Search } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SkeletonTable, ErrorState, DataTablePagination } from "@/components/shared";
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
  LIFO: "bg-violet-50 text-violet-700 border-violet-200",
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

interface CostingTableRowProps {
  row: CostingProductRow;
}

function CostingTableRow({ row }: CostingTableRowProps) {
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
      <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">
        {row.costingMethod === "STANDARD" && !row.isLocked
          ? formatCents(row.standardCost)
          : row.standardCost != null
          ? <span className="text-foreground">{formatCents(row.standardCost)}</span>
          : "—"}
      </td>
      <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">
        {formatCents(row.averageCost)}
      </td>
      <td className="px-4 py-3 text-sm tabular-nums">{row.onHandQty.toLocaleString()}</td>
      <td className="px-4 py-3">
        {row.isLocked ? (
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
        ) : null}
      </td>
    </tr>
  );
}

export function CostingClient() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useCostingProducts({
    search: search || undefined,
    page,
  });

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

      {isLoading ? (
        <SkeletonTable rows={6} columns={6} />
      ) : error ? (
        <ErrorState onRetry={handleRetry} />
      ) : rows.length === 0 ? (
        <EmptyState
          illustrationPreset="inventory"
          title="No products found"
          description={search ? "No products match your search." : "Add products to configure costing methods."}
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
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Costing Method</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Standard Cost</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Average Cost</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">On Hand</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground w-10" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <CostingTableRow key={row.variantId} row={row} />
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
