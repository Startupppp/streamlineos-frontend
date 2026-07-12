"use client";

import { Suspense, useMemo, type ChangeEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Download, Search } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyReportIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { useStockSummary, type StockSummaryRow } from "@/hooks/api/inventory/reports";
import { useWarehouses } from "@/hooks/api/inventory/warehouses";

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

const STOCK_SUMMARY_COLUMNS: DataTableColumn<StockSummaryRow>[] = [
  {
    key: "productName",
    header: "Product",
    cell: (row) => <span className="font-medium text-[11px]">{row.productName}</span>,
  },
  {
    key: "sku",
    header: "SKU",
    cell: (row) => <span className="font-mono tabular-nums text-[11px]">{row.sku}</span>,
  },
  {
    key: "categoryName",
    header: "Category",
    cell: (row) => <span className="text-[11px]">{row.categoryName ?? "—"}</span>,
  },
  {
    key: "warehouseName",
    header: "Warehouse",
    cell: (row) => <span className="text-[11px]">{row.warehouseName ?? "—"}</span>,
  },
  {
    key: "onHandQty",
    header: "On Hand",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums text-[11px]",
    cell: (row) => row.onHandQty,
  },
  {
    key: "reservedQty",
    header: "Reserved",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums text-[11px]",
    cell: (row) => row.reservedQty,
  },
  {
    key: "availableQty",
    header: "Available",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums text-[11px]",
    cell: (row) => row.availableQty,
  },
  {
    key: "reorderPoint",
    header: "Reorder Pt.",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums text-[11px]",
    cell: (row) => row.reorderPoint ?? "—",
  },
  {
    key: "totalValue",
    header: "Total Value",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums text-[11px]",
    cell: (row) => row.totalValue > 0 ? row.totalValue.toFixed(2) : "—",
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <StockLevelBadge available={row.availableQty} reorderPoint={row.reorderPoint} />,
  },
];

function StockSummaryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const warehousesQuery = useWarehouses();
  const warehouses = warehousesQuery.data ?? [];

  const search = searchParams.get("q") ?? "";
  const warehouseParam = searchParams.get("warehouse") ?? "all";
  const currentPage = Number(searchParams.get("page") ?? "1");

  const query = useStockSummary({ page: currentPage, limit: 50 });
  const items = query.data?.items ?? [];

  const filtered = useMemo(
    () =>
      items.filter((r) => {
        const matchesSearch =
          !search ||
          r.productName.toLowerCase().includes(search.toLowerCase()) ||
          r.sku.toLowerCase().includes(search.toLowerCase()) ||
          (r.categoryName?.toLowerCase() ?? "").includes(search.toLowerCase()) ||
          (r.warehouseName?.toLowerCase() ?? "").includes(search.toLowerCase());
        const matchesWarehouse =
          warehouseParam === "all" || r.warehouseName === warehouseParam;
        return matchesSearch && matchesWarehouse;
      }),
    [items, search, warehouseParam],
  );

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
    params.delete("page");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleClearSearch(): void {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("page");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleWarehouseChange(value: string): void {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("warehouse");
    } else {
      params.set("warehouse", value);
    }
    params.delete("page");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handlePageChange(page: number): void {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleExportClick(): void {
    exportToCsv(filtered);
  }

  const hasData = !query.isLoading && !query.error;
  const noResults = hasData && items.length > 0 && filtered.length === 0;
  const noData = hasData && items.length === 0;

  return (
    <PageWrapper
      eyebrow="Inventory · Reports"
      title="Stock Summary"
      subtitle={
        query.data !== undefined
          ? `${query.data.total} stock record${query.data.total !== 1 ? "s" : ""}`
          : "Current stock levels across all products"
      }
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 lg:gap-3">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search products, SKU…"
              className="h-8 w-full min-w-0 pl-8 text-xs"
            />
          </div>
          <Select value={warehouseParam} onValueChange={handleWarehouseChange}>
            <SelectTrigger className="h-8 w-[160px] min-w-0 text-xs shrink-0">
              <SelectValue placeholder="All warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All warehouses</SelectItem>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.name}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        </div>
      }
    >
      {query.error && (
        <ErrorState description={query.error.message} onRetry={handleRetry} className="flex-1" />
      )}

      {noData && (
        <InventoryEmptyState
          illustration={<EmptyReportIllustration />}
          title="No stock data"
          description="No products have stock levels recorded yet."
          className="min-h-[40vh]"
        />
      )}

      {noResults && (
        <InventoryEmptyState
          illustration={<EmptySearchIllustration />}
          title="No results"
          description="No stock records match your search."
          action={{ label: "Clear search", onClick: handleClearSearch }}
          className="min-h-[40vh]"
        />
      )}

      {!query.error && !noData && !noResults && (
        <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
          <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
            <DataTable
              data={filtered}
              columns={STOCK_SUMMARY_COLUMNS}
              getRowKey={(row) => `${row.productId}-${row.warehouseName}`}
              isLoading={query.isLoading}
              minWidth="920px"
              pagination={{
                mode: "server",
                page: currentPage,
                pageSize: 50,
                total: query.data?.total ?? 0,
                onPageChange: handlePageChange,
              }}
            />
          </CardContent>
        </Card>
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
