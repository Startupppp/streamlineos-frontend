"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import Link from "next/link";
import { Package } from "lucide-react";
import { PlusIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { toast } from "sonner";
import {
  EmptyProductsIllustration,
  EmptySearchIllustration,
} from "@/components/illustrations";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import {
  CONTENT_FILL_PANEL,
  FILTER_SELECT_TRIGGER,
} from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";
import {
  useProducts,
  useCategories,
  useArchiveProduct,
  useRestoreProduct,
  useDeleteProduct,
} from "@/hooks/api/inventory";
import { useCan } from "@/hooks/api/access";
import type { InventoryProduct, TrackingMethod } from "@/types/inventory";

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
        className="h-4 text-[9px] px-1.5 py-0 border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
      >
        Active
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="h-4 text-[9px] px-1.5 py-0 border-border text-muted-foreground bg-muted"
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
        className="h-4 text-[9px] px-1.5 py-0 tabular-nums border-red-200 text-red-700 bg-red-50 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30"
      >
        Out
      </Badge>
    );
  }
  if (qty < 10) {
    return (
      <Badge
        variant="outline"
        className="h-4 text-[9px] px-1.5 py-0 tabular-nums border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30"
      >
        {qty} low
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="h-4 text-[9px] px-1.5 py-0 tabular-nums border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
    >
      {qty}
    </Badge>
  );
}

function TrackingBadge({
  method,
}: {
  method: TrackingMethod | null | undefined;
}) {
  if (!method || method === "NONE") {
    return <span className="text-muted-foreground text-[10px]">—</span>;
  }
  if (method === "LOT") {
    return (
      <Badge
        variant="outline"
        className="h-4 text-[9px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30"
      >
        Lot
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="h-4 text-[9px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30"
    >
      Serial
    </Badge>
  );
}

function ProductRowActions({ product }: { product: InventoryProduct }) {
  const [alertOpen, setAlertOpen] = useState<boolean>(false);
  const { iconRef: ellipsisRef, hoverHandlers: ellipsisHover } =
    useAnimatedIcon();
  const archiveMutation = useArchiveProduct();
  const restoreMutation = useRestoreProduct();
  const deleteMutation = useDeleteProduct();
  const canUpdate = useCan("inventory:products:update");

  function handleArchive(): void {
    archiveMutation.mutate(product.id, {
      onSuccess: () => toast.success("Product archived"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleRestore(): void {
    restoreMutation.mutate(product.id, {
      onSuccess: () => toast.success("Product restored"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleDeleteConfirm(): void {
    deleteMutation.mutate(product.id, {
      onSuccess: () => {
        setAlertOpen(false);
        toast.success("Product deleted");
      },
      onError: (err) => {
        setAlertOpen(false);
        toast.error(getErrorMessage(err), {
          description: "Consider archiving this product instead.",
        });
      },
    });
  }

  function handleAlertOpenChange(open: boolean): void {
    setAlertOpen(open);
  }

  return (
    <AlertDialog open={alertOpen} onOpenChange={handleAlertOpenChange}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-7"
            {...ellipsisHover}
          >
            <EllipsisIcon ref={ellipsisRef} size={14} />
            <span className="sr-only">Product actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/inventory/products/${product.id}`}>View</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/inventory/products/${product.id}`}>Edit</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {canUpdate && !product.isArchived && product.status === "ACTIVE" && (
            <DropdownMenuItem onClick={handleArchive}>Archive</DropdownMenuItem>
          )}
          {canUpdate && product.isArchived && (
            <DropdownMenuItem onClick={handleRestore}>Restore</DropdownMenuItem>
          )}
          <AlertDialogTrigger asChild>
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete product?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. Archiving preserves history without
            removing the product.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteConfirm}
            disabled={deleteMutation.isPending}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ProductsPageInner() {
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
  }, [debouncedSearch]);

  function handleSearchChange(value: string) {
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
      <div className="w-full max-w-md min-w-[200px]">
        <SearchInput
          value={search}
          onValueChange={handleSearchChange}
          placeholder="Search products by name, SKU, or barcode..."
        />
      </div>
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
          <SelectContent>
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
    </div>
  );

  return (
    <PageWrapper
      title="Products"
      subtitle={
        total > 0
          ? `${total} ${total === 1 ? "product" : "products"}`
          : "Manage your product catalogue"
      }
      actions={
        !isFirstLoad ? (
          <Button size="sm" asChild {...plusHover}>
            <Link href="/inventory/products/new">
              <PlusIcon ref={plusRef} size={14} className="mr-1.5" />
              New Product
            </Link>
          </Button>
        ) : undefined
      }
      filters={filtersRow}
    >
      {productsQuery.error ? (
        <ErrorState
          title="Failed to load products"
          description={productsQuery.error.message}
          onRetry={handleRetry}
        />
      ) : isFirstLoad ? (
        <InventoryEmptyState
          illustration={<EmptyProductsIllustration />}
          title="Add your first product"
          description="Start building your product catalogue. Define SKUs, set pricing, configure stock tracking, and manage variants all in one place."
          action={{ label: "Add Product", href: "/inventory/products/new" }}
          secondaryAction={{
            label: "Import Products",
            href: "/inventory/import",
          }}
          className={CONTENT_FILL_PANEL}
        />
      ) : (
        <DataTable
          data={items}
          columns={columns}
          getRowKey={(p) => p.id}
          isLoading={productsQuery.isLoading}
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
          className="flex-1 min-h-0"
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
