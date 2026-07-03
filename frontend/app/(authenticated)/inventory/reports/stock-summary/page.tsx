"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Download, Search } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { EmptySearchIllustration } from "@/components/illustrations";
import { useStockSummary, type StockSummaryRow } from "@/hooks/api/inventory/reports";

function StockLevelBadge({
  available,
  reorderPoint,
}: {
  available: number;
  reorderPoint: number | null;
}) {
  if (reorderPoint !== null && available <= 0) {
    return (
      <Badge variant="outline" className="h-4 text-[9px] px-1.5 py-0 bg-red-50 text-red-700 border-red-200">
        Out of stock
      </Badge>
    );
  }
  if (reorderPoint !== null && available <= reorderPoint) {
    return (
      <Badge variant="outline" className="h-4 text-[9px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">
        Low stock
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="h-4 text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">
      OK
    </Badge>
  );
}

function exportToCsv(rows: StockSummaryRow[]): void {
  const headers = [
    "Product", "SKU", "Category", "UOM", "Warehouse",
    "On Hand", "Reserved", "Available", "Reorder Point",
    "Cost Price", "Total Value", "Status",
  ];
  const csvRows = rows.map((r) => [
    r.productName,
    r.sku,
    r.categoryName ?? "",
    r.uom ?? "",
    r.warehouseName ?? "",
    r.onHandQty,
    r.reservedQty,
    r.availableQty,
    r.reorderPoint ?? "",
    r.costPrice ? Number(r.costPrice).toFixed(2) : "",
    r.totalValue > 0 ? r.totalValue.toFixed(2) : "",
    r.reorderPoint !== null && r.availableQty <= 0
      ? "Out of stock"
      : r.reorderPoint !== null && r.availableQty <= r.reorderPoint
        ? "Low stock"
        : "OK",
  ]);
  const content = [headers, ...csvRows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `stock-summary-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function StockSummaryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = useStockSummary();
  const rows = query.data ?? [];

  const search = searchParams.get("q") ?? "";

  const filtered = search
    ? rows.filter(
        (r) =>
          r.productName.toLowerCase().includes(search.toLowerCase()) ||
          r.sku.toLowerCase().includes(search.toLowerCase()) ||
          (r.categoryName?.toLowerCase() ?? "").includes(search.toLowerCase()) ||
          (r.warehouseName?.toLowerCase() ?? "").includes(search.toLowerCase()),
      )
    : rows;

  function handleRetry(): void {
    void query.refetch();
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>): void {
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

  function handleExportClick(): void {
    exportToCsv(filtered);
  }

  return (
    <PageWrapper
      eyebrow="Inventory · Reports"
      title="Stock Summary"
      subtitle={
        query.data !== undefined
          ? `${filtered.length} stock record${filtered.length !== 1 ? "s" : ""}`
          : "Current stock levels across all products"
      }
      filters={
        <>
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search products, SKU, warehouse…"
              className="h-8 w-full min-w-0 pl-8 text-xs"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs ml-auto shrink-0"
            onClick={handleExportClick}
            disabled={filtered.length === 0}
            aria-label="Export stock summary as CSV"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>
        </>
      }
    >
      {query.isLoading && <SkeletonTable rows={8} columns={10} />}
      {query.error && (
        <ErrorState description={query.error.message} onRetry={handleRetry} className="flex-1" />
      )}

      {!query.isLoading && !query.error && rows.length === 0 && (
        <EmptyState
          illustration={<EmptySearchIllustration />}
          title="No stock data"
          description="No products have stock levels recorded yet."
          className="min-h-[40vh]"
        />
      )}

      {!query.isLoading && !query.error && rows.length > 0 && (
        <>
          {filtered.length === 0 ? (
            <EmptyState
              illustration={<EmptySearchIllustration />}
              title="No results"
              description="No stock records match your search."
              action={{ label: "Clear search", onClick: handleClearSearch }}
              className="min-h-[40vh]"
            />
          ) : (
            <div className="rounded-md border border-border bg-card overflow-x-auto">
              <Table className="min-w-[920px] text-[11px]">
                <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                  <TableRow className="border-b-2 border-border">
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Product</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">SKU</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Category</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Warehouse</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">On Hand</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Reserved</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Available</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Reorder Pt.</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Total Value</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Status</TableHead>
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
                      <TableCell className="px-2 py-1 text-right font-mono tabular-nums">{row.onHandQty}</TableCell>
                      <TableCell className="px-2 py-1 text-right font-mono tabular-nums">{row.reservedQty}</TableCell>
                      <TableCell className="px-2 py-1 text-right font-mono tabular-nums font-medium">{row.availableQty}</TableCell>
                      <TableCell className="px-2 py-1 text-right font-mono tabular-nums">{row.reorderPoint ?? "—"}</TableCell>
                      <TableCell className="px-2 py-1 text-right font-mono tabular-nums">
                        {row.totalValue > 0 ? row.totalValue.toFixed(2) : "—"}
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        <StockLevelBadge available={row.availableQty} reorderPoint={row.reorderPoint} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </PageWrapper>
  );
}

export default function StockSummaryReportPage() {
  return (
    <Suspense>
      <StockSummaryContent />
    </Suspense>
  );
}
