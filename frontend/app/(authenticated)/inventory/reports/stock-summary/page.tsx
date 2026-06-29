"use client";

import { Download } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptySearchIllustration } from "@/components/illustrations";
import { useStockSummary, type StockSummaryRow } from "@/hooks/api/inventory/reports";

function StockLevelBadge({ available, reorderPoint }: { available: number; reorderPoint: number | null }) {
  if (reorderPoint !== null && available <= 0) {
    return <Badge variant="destructive" className="text-[11px]">Out of stock</Badge>;
  }
  if (reorderPoint !== null && available <= reorderPoint) {
    return <Badge className="text-[11px] bg-yellow-100 text-yellow-800 border-yellow-200">Low stock</Badge>;
  }
  return <Badge className="text-[11px] bg-green-100 text-green-800 border-green-200">OK</Badge>;
}

function handleExportCsv(rows: StockSummaryRow[]): void {
  const headers = ["Product", "SKU", "Category", "UOM", "Warehouse", "On Hand", "Reserved", "Available", "Reorder Point", "Cost Price", "Total Value", "Status"];
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
    r.totalValue ? Number(r.totalValue).toFixed(2) : "",
    r.reorderPoint !== null && r.availableQty <= 0
      ? "Out of stock"
      : r.reorderPoint !== null && r.availableQty <= r.reorderPoint
      ? "Low stock"
      : "OK",
  ]);
  const content = [headers, ...csvRows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `stock-summary-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function StockSummaryReportPage() {
  const query = useStockSummary();

  const rows = query.data ?? [];

  function handleExportClick() { handleExportCsv(rows); }
  function handleRetry() { void query.refetch(); }

  return (
    <PageWrapper
      eyebrow="Inventory · Reports"
      title="Stock Summary"
      subtitle="Current stock levels across all products and warehouses."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportClick}
          disabled={rows.length === 0}
        >
          <Download className="size-4 mr-1" />
          Export CSV
        </Button>
      }
    >
      {query.isLoading && <LoadingState variant="table" rows={10} />}
      {query.error && <ErrorState description={query.error.message} onRetry={handleRetry} />}

      {!query.isLoading && !query.error && rows.length === 0 && (
        <EmptyState
          illustration={<EmptySearchIllustration />}
          title="No stock data"
          description="No products have stock levels recorded yet."
        />
      )}

      {rows.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">On Hand</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Reorder Pt.</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.productId}-${row.warehouseName}`}>
                  <TableCell className="font-medium">{row.productName}</TableCell>
                  <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                  <TableCell>{row.categoryName ?? "—"}</TableCell>
                  <TableCell>{row.warehouseName ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.onHandQty}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.reservedQty}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{row.availableQty}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.reorderPoint ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.totalValue ? Number(row.totalValue).toFixed(2) : "—"}
                  </TableCell>
                  <TableCell>
                    <StockLevelBadge available={row.availableQty} reorderPoint={row.reorderPoint} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PageWrapper>
  );
}
