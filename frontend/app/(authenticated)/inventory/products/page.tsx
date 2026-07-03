"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Package, Search } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { useProducts, useCategories } from "@/hooks/api/inventory";
import type { InventoryProduct } from "@/types/inventory";

const PAGE_LIMIT = 20;

function formatPrice(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") {
    return (
      <Badge
        variant="outline"
        className="h-4 text-[9px] px-1.5 py-0 border-emerald-200 text-emerald-700 bg-emerald-50"
      >
        Active
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="h-4 text-[9px] px-1.5 py-0 border-slate-200 text-slate-600 bg-slate-100"
    >
      Inactive
    </Badge>
  );
}

function StockBadge({ qty }: { qty: number }) {
  if (qty <= 0) {
    return (
      <Badge
        variant="outline"
        className="h-4 text-[9px] px-1.5 py-0 tabular-nums border-red-200 text-red-700 bg-red-50"
      >
        Out
      </Badge>
    );
  }
  if (qty < 10) {
    return (
      <Badge
        variant="outline"
        className="h-4 text-[9px] px-1.5 py-0 tabular-nums border-amber-200 text-amber-700 bg-amber-50"
      >
        {qty} low
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="h-4 text-[9px] px-1.5 py-0 tabular-nums border-emerald-200 text-emerald-700 bg-emerald-50"
    >
      {qty}
    </Badge>
  );
}

function ProductsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const statusParam = searchParams.get("status") ?? "";
  const categoryIdParam = searchParams.get("categoryId") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  function updateParams(updates: Record<string, string | null>): void {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    params.delete("page");
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>): void {
    updateParams({ search: e.target.value || null });
  }

  function handleStatusChange(value: string): void {
    updateParams({ status: value === "all" ? null : value });
  }

  function handleCategoryChange(value: string): void {
    updateParams({ categoryId: value === "all" ? null : value });
  }

  function handlePageChange(nextPage: number): void {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  const categoriesQuery = useCategories();
  const categories = categoriesQuery.data ?? [];

  const statusFilter =
    statusParam === "ACTIVE"
      ? ("ACTIVE" as const)
      : statusParam === "INACTIVE"
        ? ("INACTIVE" as const)
        : undefined;
  const categoryId = categoryIdParam ? Number(categoryIdParam) : undefined;

  const productsQuery = useProducts({
    search: search || undefined,
    status: statusFilter,
    categoryId,
    page,
    limit: PAGE_LIMIT,
  });

  const items = productsQuery.data?.items ?? [];
  const total = productsQuery.data?.total ?? 0;

  function handleRetry(): void {
    void productsQuery.refetch();
  }

  function handleClearFilters(): void {
    router.replace("?", { scroll: false });
  }

  const hasFilters = !!(search || statusParam || categoryIdParam);

  const columns: DataTableColumn<InventoryProduct>[] = [
    {
      key: "name",
      header: "Name",
      cell: (p) => (
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-muted flex items-center justify-center shrink-0">
            <Package className="h-3 w-3 text-muted-foreground/60" aria-hidden="true" />
          </div>
          <Link
            href={`/inventory/products/${p.id}`}
            className="text-blue-600 hover:underline transition-colors font-medium truncate"
          >
            {p.name}
          </Link>
        </div>
      ),
      sortable: true,
      sortValue: (p) => p.name,
    },
    {
      key: "sku",
      header: "SKU",
      headerClassName: "w-[130px]",
      className: "font-mono tabular-nums text-muted-foreground",
      cell: (p) => p.sku,
    },
    {
      key: "category",
      header: "Category",
      headerClassName: "w-[140px]",
      className: "text-muted-foreground",
      cell: (p) => p.category?.name ?? "—",
    },
    {
      key: "uom",
      header: "UOM",
      headerClassName: "w-[80px]",
      className: "text-muted-foreground",
      cell: (p) => p.uom?.abbreviation ?? "—",
    },
    {
      key: "costPrice",
      header: "Cost Price",
      headerClassName: "w-[120px] text-right",
      className: "text-right font-mono tabular-nums text-muted-foreground",
      cell: (p) => formatPrice(p.costPrice),
    },
    {
      key: "price",
      header: "Price",
      headerClassName: "w-[120px] text-right",
      className: "text-right font-mono tabular-nums font-medium",
      cell: (p) => formatPrice(p.sellingPrice),
    },
    {
      key: "stock",
      header: "Stock",
      headerClassName: "w-[90px] text-right",
      className: "text-right",
      cell: (p) => <StockBadge qty={p.totalStock ?? 0} />,
    },
    {
      key: "status",
      header: "Status",
      headerClassName: "w-[80px]",
      cell: (p) => <StatusBadge status={p.status} />,
    },
  ];

  const filtersRow = (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
      <div className="relative min-w-0 flex-1 lg:max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by name or SKU..."
          className="h-8 w-full min-w-0 pl-8 text-xs"
        />
      </div>
      <div className="hidden min-w-0 flex-[2] flex-row flex-nowrap items-center gap-2 sm:flex">
        <Select
          value={statusParam || "all"}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="h-8 min-w-0 flex-1 text-xs">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={categoryIdParam || "all"}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="h-8 min-w-0 flex-1 text-xs">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={String(cat.id)}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <PageWrapper
      eyebrow="Inventory · Products"
      title="Products"
      subtitle={
        total > 0
          ? `${total} ${total === 1 ? "product" : "products"}`
          : "Manage your product catalogue"
      }
      actions={
        <Button size="sm" asChild>
          <Link href="/inventory/products/new">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Product
          </Link>
        </Button>
      }
      filters={filtersRow}
    >
      {productsQuery.error ? (
        <ErrorState
          title="Failed to load products"
          description={productsQuery.error.message}
          onRetry={handleRetry}
          className="min-h-[40vh]"
        />
      ) : (
        <DataTable
          data={items}
          columns={columns}
          getRowKey={(p) => p.id}
          isLoading={productsQuery.isLoading}
          emptyState={
            <EmptyState
              illustration={
                <Package className="h-8 w-8 text-muted-foreground/40" />
              }
              title={hasFilters ? "No products found" : "No products yet"}
              description={
                hasFilters
                  ? "Try adjusting your search or filters."
                  : "Add your first product to get started."
              }
              action={
                hasFilters
                  ? { label: "Clear filters", onClick: handleClearFilters }
                  : { label: "New Product", href: "/inventory/products/new" }
              }
              className="border-0 bg-transparent min-h-[40vh]"
            />
          }
          pagination={{
            mode: "server",
            page,
            pageSize: PAGE_LIMIT,
            total,
            onPageChange: handlePageChange,
          }}
          minWidth="640px"
        />
      )}
    </PageWrapper>
  );
}

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsPageInner />
    </Suspense>
  );
}
