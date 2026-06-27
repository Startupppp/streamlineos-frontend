"use client";

import { AlertTriangle } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptySearchIllustration } from "@/components/illustrations";
import { useReorderReport } from "@/lib/api/hooks/inventory/reports";

interface ReorderRow {
  productId: number;
  productName: string;
  sku: string;
  categoryName: string | null;
  warehouseName: string | null;
  availableQty: number;
  reorderPoint: number;
  reorderQty: number | null;
  costPrice: string | number | null;
  vendorName: string | null;
}

function UrgencyBadge({ available, reorderPoint }: { available: number; reorderPoint: number }) {
  if (available <= 0) {
    return <Badge variant="destructive" className="text-[11px]">Out of stock</Badge>;
  }
  const pct = reorderPoint > 0 ? available / reorderPoint : 1;
  if (pct <= 0.25) {
    return <Badge className="text-[11px] bg-red-100 text-red-800 border-red-200">Critical</Badge>;
  }
  return <Badge className="text-[11px] bg-yellow-100 text-yellow-800 border-yellow-200">Low</Badge>;
}

export default function ReorderReportPage() {
  const query = useReorderReport();

  const rawData = query.data as ReorderRow[] | { items?: ReorderRow[] } | null | undefined;
  const rows: ReorderRow[] = Array.isArray(rawData)
    ? rawData
    : (rawData?.items ?? []);

  const outOfStock = rows.filter((r) => r.availableQty <= 0).length;
  const critical = rows.filter((r) => r.availableQty > 0 && r.reorderPoint > 0 && r.availableQty / r.reorderPoint <= 0.25).length;
  const low = rows.filter((r) => r.availableQty > 0 && r.reorderPoint > 0 && r.availableQty / r.reorderPoint > 0.25).length;

  return (
    <PageWrapper
      eyebrow="Inventory · Reports"
      title="Reorder Report"
      subtitle="Products that have fallen at or below their reorder point and need restocking."
    >
      {query.isLoading && <LoadingState variant="table" rows={8} />}
      {query.error && <ErrorState description={query.error.message} />}

      {!query.isLoading && !query.error && rows.length === 0 && (
        <EmptyState
          illustration={<EmptySearchIllustration />}
          title="No products need reordering"
          description="All products are above their reorder points."
        />
      )}

      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="p-4 flex items-center gap-3">
              <AlertTriangle className="size-5 text-destructive shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Out of stock</p>
                <p className="text-xl font-semibold tabular-nums">{outOfStock}</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <AlertTriangle className="size-5 text-red-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Critical (&le;25% of reorder pt.)</p>
                <p className="text-xl font-semibold tabular-nums">{critical}</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <AlertTriangle className="size-5 text-yellow-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Low stock</p>
                <p className="text-xl font-semibold tabular-nums">{low}</p>
              </div>
            </Card>
          </div>

          <div className="rounded-xl border border-border/60 bg-card overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Preferred Vendor</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Reorder Pt.</TableHead>
                  <TableHead className="text-right">Suggest Qty</TableHead>
                  <TableHead>Urgency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={`${row.productId}-${row.warehouseName}`}>
                    <TableCell className="font-medium">{row.productName}</TableCell>
                    <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                    <TableCell>{row.categoryName ?? "—"}</TableCell>
                    <TableCell>{row.warehouseName ?? "—"}</TableCell>
                    <TableCell>{row.vendorName ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.availableQty}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.reorderPoint}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {row.reorderQty ?? "—"}
                    </TableCell>
                    <TableCell>
                      <UrgencyBadge available={row.availableQty} reorderPoint={row.reorderPoint} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
