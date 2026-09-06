"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { Package, AlertTriangle, AlertCircle } from "lucide-react";
import { DownloadIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyReportIllustration, EmptySearchIllustration } from "@/components/illustrations";
import { useReorderReport, type ReorderReportRow } from "@/hooks/api/inventory/reports";
import { downloadCsv } from "@/features/inventory/lib";

function UrgencyBadge({ available, reorderPoint }: { available: number; reorderPoint: number }) {
  if (available <= 0) {
    return (
      <Badge variant="outline" className="h-4 text-micro px-1.5 py-0 bg-status-danger-surface text-status-danger-ink border-status-danger-rule">
        Out of stock
      </Badge>
    );
  }
  const pct = reorderPoint > 0 ? available / reorderPoint : 1;
  if (pct <= 0.25) {
    return (
      <Badge variant="outline" className="h-4 text-micro px-1.5 py-0 bg-status-danger-surface text-status-danger-ink border-status-danger-rule">
        Critical
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="h-4 text-micro px-1.5 py-0 bg-status-warning-surface text-status-warning-ink border-status-warning-rule">
      Low
    </Badge>
  );
}

const REORDER_COLUMNS: DataTableColumn<ReorderReportRow>[] = [
  {
    key: "productName",
    header: "Product",
    cell: (row) => <span className="font-medium text-dense">{row.productName}</span>,
  },
  {
    key: "sku",
    header: "SKU",
    cell: (row) => <span className="font-mono tabular-nums text-dense">{row.sku}</span>,
  },
  {
    key: "categoryName",
    header: "Category",
    cell: (row) => <span className="text-dense">{row.categoryName ?? "—"}</span>,
  },
  {
    key: "warehouseName",
    header: "Warehouse",
    cell: (row) => <span className="text-dense">{row.warehouseName ?? "—"}</span>,
  },
  {
    key: "vendorName",
    header: "Vendor",
    cell: (row) => <span className="text-dense">{row.vendorName ?? "—"}</span>,
  },
  {
    key: "availableQty",
    header: "Available",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums text-dense",
    cell: (row) => row.availableQty,
  },
  {
    key: "reorderPoint",
    header: "Reorder Pt.",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums text-dense",
    cell: (row) => row.reorderPoint,
  },
  {
    key: "reorderQty",
    header: "Suggest Qty",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums text-dense",
    cell: (row) => row.reorderQty ?? "—",
  },
  {
    key: "urgency",
    header: "Urgency",
    cell: (row) => <UrgencyBadge available={row.availableQty} reorderPoint={row.reorderPoint} />,
  },
];

function ReorderReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentPage = Number(searchParams.get("page") ?? "1");

  const [search, setSearch] = useState<string>(searchParams.get("q") ?? "");
  const debouncedSearch = useDebouncedValue(search, 300);

  const query = useReorderReport({ page: currentPage, limit: 50 });
  const items = useMemo(() => query.data?.items ?? [], [query.data]);

  useEffect(() => {
    const trimmed = debouncedSearch.trim() || null;
    const current = searchParams.get("q") ?? null;
    if (trimmed === current) return;
    const params = new URLSearchParams(searchParams.toString());
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    params.delete("page");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [debouncedSearch, router, searchParams]);

  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (r) =>
        r.productName.toLowerCase().includes(term) ||
        r.sku.toLowerCase().includes(term) ||
        (r.categoryName?.toLowerCase() ?? "").includes(term) ||
        (r.warehouseName?.toLowerCase() ?? "").includes(term) ||
        (r.vendorName?.toLowerCase() ?? "").includes(term),
    );
  }, [items, debouncedSearch]);

  const outOfStock = items.filter((r) => r.availableQty <= 0).length;
  const critical = items.filter(
    (r) => r.availableQty > 0 && r.reorderPoint > 0 && r.availableQty / r.reorderPoint <= 0.25,
  ).length;
  const low = items.filter(
    (r) => r.availableQty > 0 && r.reorderPoint > 0 && r.availableQty / r.reorderPoint > 0.25,
  ).length;

  function handleRetry(): void {
    void query.refetch();
  }

  function handleSearchChange(value: string): void {
    setSearch(value);
  }

  function handleClearSearch(): void {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("page");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handlePageChange(page: number): void {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleExportClick(): void {
    downloadCsv(
      `reorder-report-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Product", "SKU", "Category", "Warehouse", "Vendor", "Available", "Reorder Pt.", "Suggest Qty", "Urgency"],
      filtered.map((r) => [
        r.productName,
        r.sku,
        r.categoryName ?? "",
        r.warehouseName ?? "",
        r.vendorName ?? "",
        r.availableQty,
        r.reorderPoint,
        r.reorderQty ?? "",
        r.availableQty <= 0 ? "Out of stock" : r.reorderPoint > 0 && r.availableQty / r.reorderPoint <= 0.25 ? "Critical" : "Low",
      ]),
    );
  }

  const hasData = !query.isLoading && !query.error;
  const noData = hasData && items.length === 0;
  const noResults = hasData && items.length > 0 && filtered.length === 0;

  return (
    <PageWrapper
      title="Reorder Report"
      subtitle="Products below their reorder points"
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0 lg:gap-3">
          <SearchInput className="min-w-0 flex-1" value={search} onValueChange={handleSearchChange} placeholder="Search products, SKU, category…" />
          <AnimatedIconButton
            icon={DownloadIcon}
            iconSize={14}
            iconClassName="mr-1.5"
            variant="outline"
            size="sm"
            className="text-xs ml-auto shrink-0"
            onClick={handleExportClick}
            disabled={filtered.length === 0}
            aria-label="Export reorder report as CSV"
          >
            Export CSV
          </AnimatedIconButton>
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
      {query.error && (
        <ErrorState description={getErrorMessage(query.error)} onRetry={handleRetry} />
      )}

      {noData && (
        <InventoryEmptyState
          illustration={<EmptyReportIllustration />}
          title="No products need reordering"
          description="All products are above their reorder points."
        />
      )}

      {!query.error && !noData && (
        <div className="flex flex-col gap-3 min-h-0 flex-1">
          {!query.isLoading && (
            <StatCardGrid cols={3}>
              <StatCard label="Out of stock" value={outOfStock} icon={Package} tone="red" />
              <StatCard label="Critical (≤25% of reorder pt.)" value={critical} icon={AlertTriangle} tone="red" />
              <StatCard label="Low stock" value={low} icon={AlertCircle} tone="amber" />
            </StatCardGrid>
          )}

          {noResults ? (
            <InventoryEmptyState
              illustration={<EmptySearchIllustration />}
              title="No results"
              description="No products match your search."
              action={{ label: "Clear search", onClick: handleClearSearch }}
            />
          ) : (
            <DataTable
                  data={filtered}
                  columns={REORDER_COLUMNS}
                  className="flex-1 min-h-0"
                  getRowKey={(row) => `${row.productId}-${row.warehouseName}`}
                  isLoading={query.isLoading}
                  minWidth="860px"
                  pagination={{
                    mode: "server",
                    page: currentPage,
                    pageSize: 50,
                    total: query.data?.total ?? 0,
                    onPageChange: handlePageChange,
                  }}
                />
          )}
        </div>
      )}
      </div>
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
