"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import Link from "next/link";
import { Package } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  EmptyProductsIllustration,
  EmptySearchIllustration,
} from "@/components/illustrations";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ProductStatusBadge } from "@/features/inventory/components/product-status-badge";
import { ProductRowActions } from "@/features/inventory/components/product-lifecycle-actions";
import {
  CONTENT_FILL_PANEL,
  FILTER_SELECT_TRIGGER,
} from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import { useProducts, useCategories } from "@/hooks/api/inventory";
import { useCan } from "@/hooks/api/access";
import { MobileFilterDrawer } from "@/features/payroll/shared/mobile-filter-drawer";
import {
  formatPrice,
  StatusBadge,
  TrackingBadge,
} from "@/features/inventory/components/product-row-actions";
import type { InventoryProduct } from "@/types/inventory";

const PAGE_LIMIT = 20;

function ProductsPageInner() {
  const canView = useCan("inventory:products:read");
  const canCreate = useCan("inventory:products:create");
  const canImport = useCan("inventory:import");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { iconRef: plusRef, hoverHandlers: plusHover } = useAnimatedIcon();

  const statusParam = searchParams.get("status") ?? "";
  const categoryIdParam = searchParams.get("categoryId") ?? "";
  const productTypeParam = searchParams.get("productType") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const [search, setSearch] = useState<string>(
    searchParams.get("search") ?? "",
  );
  const debouncedSearch = useDebouncedValue(search, 300);

  const updateParams = useCallback(
    (updates: Record<string, string | null>): void => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      params.delete("page");
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  useEffect(() => {
    const trimmed = debouncedSearch.trim() || null;
    const current = searchParams.get("search") ?? null;
    if (trimmed !== current) {
      updateParams({ search: trimmed });
    }
  }, [debouncedSearch, updateParams, searchParams]);

  function handleSearchChange(value: string): void {
    setSearch(value);
  }

  function handleStatusChange(value: string): void {
    updateParams({ status: value === "all" ? null : value });
  }

  function handleCategoryChange(value: string): void {
    updateParams({ categoryId: value === "all" ? null : value });
  }

  function handleProductTypeChange(value: string): void {
    updateParams({ productType: value === "all" ? null : value });
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
        : statusParam === "DISCONTINUED"
          ? ("DISCONTINUED" as const)
          : undefined;
  const categoryId = categoryIdParam ? Number(categoryIdParam) : undefined;
  const productTypeFilter =
    productTypeParam === "STOCKABLE"
      ? ("STOCKABLE" as const)
      : productTypeParam === "CONSUMABLE"
        ? ("CONSUMABLE" as const)
        : productTypeParam === "SERVICE"
          ? ("SERVICE" as const)
          : undefined;

  const productsQuery = useProducts({
    search: debouncedSearch.trim() || undefined,
    status: statusFilter,
    categoryId,
    productType: productTypeFilter,
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

  const hasFilters = !!(
    search.trim() ||
    statusParam ||
    categoryIdParam ||
    productTypeParam
  );
  const isFirstLoad =
    canView &&
    !productsQuery.isLoading &&
    !productsQuery.error &&
    total === 0 &&
    !hasFilters;

  const columns = useMemo<DataTableColumn<InventoryProduct>[]>(
    () => [
      {
        key: "name",
        header: "Name",
        cell: (p) => (
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-muted flex items-center justify-center shrink-0">
              <Package
                className="h-3 w-3 text-muted-foreground/60"
                aria-hidden="true"
              />
            </div>
            <Link
              href={`/inventory/products/${p.id}`}
              className="text-primary hover:underline transition-colors font-medium truncate"
            >
              {p.name}
            </Link>
          </div>
        ),
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
        key: "tracking",
        header: "Tracking",
        headerClassName: "w-[90px]",
        cell: (p) => <TrackingBadge method={p.trackingMethod} />,
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
        key: "status",
        header: "Status",
        headerClassName: "w-[110px]",
        cell: (p) => <ProductStatusBadge status={p.status} />,
      },
      {
        key: "actions",
        header: "",
        headerClassName: "w-8",
        cell: (p) => <ProductRowActions product={p} />,
      },
    ],
    [],
  );

  const filtersRow = isFirstLoad ? undefined : (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
      <SearchInput
        value={search}
        onValueChange={handleSearchChange}
        placeholder="Search products by name, SKU, or barcode..."
      />
      <div className="hidden min-w-0 flex-row flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide sm:flex [&>*]:shrink-0">
        <Select value={statusParam || "all"} onValueChange={handleStatusChange}>
          <SelectTrigger
            className={cn(FILTER_SELECT_TRIGGER, "min-w-0 flex-1 text-xs")}
          >
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={categoryIdParam || "all"}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger
            className={cn(FILTER_SELECT_TRIGGER, "min-w-0 flex-1 text-xs")}
          >
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={String(cat.id)}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={productTypeParam || "all"}
          onValueChange={handleProductTypeChange}
        >
          <SelectTrigger
            className={cn(FILTER_SELECT_TRIGGER, "min-w-0 flex-1 text-xs")}
          >
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="STOCKABLE">Stockable</SelectItem>
            <SelectItem value="CONSUMABLE">Consumable</SelectItem>
            <SelectItem value="SERVICE">Service</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <MobileFilterDrawer
        ariaLabel="Filter products"
        groups={[
          {
            label: "Status",
            value: statusParam || "all",
            options: [
              { value: "all", label: "All statuses" },
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
              { value: "DISCONTINUED", label: "Discontinued" },
            ],
            onChange: handleStatusChange,
          },
          {
            label: "Category",
            value: categoryIdParam || "all",
            options: [
              { value: "all", label: "All categories" },
              ...categories.map((cat) => ({
                value: String(cat.id),
                label: cat.name,
              })),
            ],
            onChange: handleCategoryChange,
          },
          {
            label: "Type",
            value: productTypeParam || "all",
            options: [
              { value: "all", label: "All types" },
              { value: "STOCKABLE", label: "Stockable" },
              { value: "CONSUMABLE", label: "Consumable" },
              { value: "SERVICE", label: "Service" },
            ],
            onChange: handleProductTypeChange,
          },
        ]}
      />
    </div>
  );

  return (
    <PageWrapper
      title="Products"
      subtitle="Manage your product catalogue"
      actions={
        !isFirstLoad && canCreate ? (
          <Button size="sm" asChild {...plusHover}>
            <Link href="/inventory/products/new">
              <PlusIcon ref={plusRef} size={14} className="mr-1.5" />
              New Product
            </Link>
          </Button>
        ) : undefined
      }
      filters={canView ? filtersRow : undefined}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {!canView ? (
          <NoPermissionState
            permission="inventory:products:read"
            className="flex-1"
          />
        ) : productsQuery.error ? (
          <ErrorState
            title="Failed to load products"
            description={getErrorMessage(productsQuery.error)}
            onRetry={handleRetry}
          />
        ) : isFirstLoad ? (
          <InventoryEmptyState
            illustration={<EmptyProductsIllustration />}
            title={canCreate ? "Add your first product" : "No products yet"}
            description="Start building your product catalogue. Define SKUs, set pricing, configure stock tracking, and manage variants all in one place."
            action={
              canCreate
                ? { label: "Add Product", href: "/inventory/products/new" }
                : undefined
            }
            secondaryAction={
              canImport
                ? { label: "Import Products", href: "/inventory/import" }
                : undefined
            }
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <DataTable
            data={items}
            columns={columns}
            getRowKey={(p) => p.id}
            isLoading={productsQuery.isLoading}
            className="flex-1 min-h-0"
            emptyState={
              <InventoryEmptyState
                illustration={<EmptySearchIllustration />}
                title="No products found"
                description="Try adjusting your search or filters."
                action={{ label: "Clear filters", onClick: handleClearFilters }}
                className="border-0 bg-transparent"
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
      </div>
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
