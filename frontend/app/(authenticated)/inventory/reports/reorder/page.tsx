"use client";

import { Suspense, type ChangeEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Package, AlertTriangle, AlertCircle, Search } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SkeletonTable, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyReportIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { useReorderReport } from "@/hooks/api/inventory/reports";

function UrgencyBadge({ available, reorderPoint }: { available: number; reorderPoint: number }) {
  if (available <= 0) {
    return (
      <Badge variant="outline" className="h-4 text-[9px] px-1.5 py-0 bg-red-50 text-red-700 border-red-200">
        Out of stock
      </Badge>
    );
  }
  const pct = reorderPoint > 0 ? available / reorderPoint : 1;
  if (pct <= 0.25) {
    return (
      <Badge variant="outline" className="h-4 text-[9px] px-1.5 py-0 bg-red-50 text-red-700 border-red-200">
        Critical
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="h-4 text-[9px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">
      Low
    </Badge>
  );
}

function ReorderReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = useReorderReport();
  const rows = query.data ?? [];

  const search = searchParams.get("q") ?? "";

  const filtered = search
    ? rows.filter(
        (r) =>
          r.productName.toLowerCase().includes(search.toLowerCase()) ||
          r.sku.toLowerCase().includes(search.toLowerCase()) ||
          (r.categoryName?.toLowerCase() ?? "").includes(search.toLowerCase()) ||
          (r.warehouseName?.toLowerCase() ?? "").includes(search.toLowerCase()) ||
          (r.vendorName?.toLowerCase() ?? "").includes(search.toLowerCase()),
      )
    : rows;

  const outOfStock = rows.filter((r) => r.availableQty <= 0).length;
  const critical = rows.filter(
    (r) => r.availableQty > 0 && r.reorderPoint > 0 && r.availableQty / r.reorderPoint <= 0.25,
  ).length;
  const low = rows.filter(
    (r) => r.availableQty > 0 && r.reorderPoint > 0 && r.availableQty / r.reorderPoint > 0.25,
  ).length;

  function handleRetry(): void {
    void query.refetch();
  }

  function handleSearchChange(e: ChangeEvent<HTMLInputElement>): void {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("q", e.target.value);
    } else {
      params.delete("q");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleClearSearch(): void {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <PageWrapper
      eyebrow="Inventory · Reports"
      title="Reorder Report"
      subtitle={
        query.data !== undefined
          ? `${filtered.length} product${filtered.length !== 1 ? "s" : ""} need reordering`
          : "Products below their reorder points"
      }
      filters={
        <div className="relative min-w-0 flex-1 lg:max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={handleSearchChange}
            placeholder="Search products, SKU, category…"
            className="h-8 w-full min-w-0 pl-8 text-xs"
          />
        </div>
      }
    >
      {query.isLoading && <SkeletonTable rows={8} columns={9} />}
      {query.error && (
        <ErrorState description={query.error.message} onRetry={handleRetry} className="flex-1" />
      )}

      {!query.isLoading && !query.error && rows.length === 0 && (
        <EmptyState
          illustration={<EmptyReportIllustration />}
          title="No products need reordering"
          description="All products are above their reorder points."
          className="min-h-[40vh]"
        />
      )}

      {!query.isLoading && !query.error && rows.length > 0 && (
        <div className="space-y-3">
          <StatCardGrid cols={3}>
            <StatCard label="Out of stock" value={outOfStock} icon={Package} tone="red" />
            <StatCard label="Critical (≤25% of reorder pt.)" value={critical} icon={AlertTriangle} tone="red" />
            <StatCard label="Low stock" value={low} icon={AlertCircle} tone="amber" />
          </StatCardGrid>

          {filtered.length === 0 ? (
            <EmptyState
              illustration={<EmptySearchIllustration />}
              title="No results"
              description="No products match your search."
              action={{ label: "Clear search", onClick: handleClearSearch }}
              className="min-h-[40vh]"
            />
          ) : (
            <div className="rounded-md border border-border bg-card overflow-x-auto">
              <Table className="min-w-[860px] text-[11px]">
                <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                  <TableRow className="border-b-2 border-border">
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Product</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">SKU</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Category</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Warehouse</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Vendor</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Available</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Reorder Pt.</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Suggest Qty</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Urgency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow
                      key={`${row.productId}-${row.warehouseName}`}
                      className="h-8 hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="px-2 py-1 font-medium">{row.productName}</TableCell>
                      <TableCell className="px-2 py-1 font-mono tabular-nums">{row.sku}</TableCell>
                      <TableCell className="px-2 py-1">{row.categoryName ?? "—"}</TableCell>
                      <TableCell className="px-2 py-1">{row.warehouseName ?? "—"}</TableCell>
                      <TableCell className="px-2 py-1">{row.vendorName ?? "—"}</TableCell>
                      <TableCell className="px-2 py-1 text-right font-mono tabular-nums">{row.availableQty}</TableCell>
                      <TableCell className="px-2 py-1 text-right font-mono tabular-nums">{row.reorderPoint}</TableCell>
                      <TableCell className="px-2 py-1 text-right font-mono tabular-nums font-medium">
                        {row.reorderQty ?? "—"}
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        <UrgencyBadge available={row.availableQty} reorderPoint={row.reorderPoint} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}

export default function ReorderReportPage() {
  return (
    <Suspense>
      <ReorderReportContent />
    </Suspense>
  );
}
