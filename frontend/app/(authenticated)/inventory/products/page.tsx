"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Package } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ListToolbar,
  LoadingState,
  ErrorState,
  DataTablePagination,
} from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { useProducts, useCategories } from "@/hooks/api/inventory";

interface Category {
  id: number;
  name: string;
}

function formatPrice(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const PAGE_LIMIT = 20;

export default function ProductsPage() {
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [page, setPage] = useState<number>(1);

  const categoriesQuery = useCategories();
  const categories = (categoriesQuery.data ?? []) as Category[];

  const status =
    statusFilter === "active"
      ? ("ACTIVE" as const)
      : statusFilter === "inactive"
        ? ("INACTIVE" as const)
        : undefined;

  const productsQuery = useProducts({
    search: search || undefined,
    status,
    categoryId: categoryFilter !== "all" ? Number(categoryFilter) : undefined,
    page,
    limit: PAGE_LIMIT,
  });

  const items = productsQuery.data?.items ?? [];
  const total = productsQuery.data?.total ?? 0;
  const totalPages = productsQuery.data?.totalPages ?? 1;

  function handleSearchChange(value: string): void {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(value: string): void {
    setStatusFilter(value);
    setPage(1);
  }

  function handleCategoryChange(value: string): void {
    setCategoryFilter(value);
    setPage(1);
  }

  function handlePageChange(nextPage: number): void {
    setPage(nextPage);
  }

  function handleRetry(): void {
    void productsQuery.refetch();
  }

  return (
    <PageWrapper
      eyebrow="Inventory · Products"
      title="Products"
      subtitle="Manage your product catalogue, pricing, and stock."
      badge={total > 0 ? `${total}` : undefined}
      actions={
        <Button size="sm" asChild>
          <Link href="/inventory/products/new">
            <Plus className="mr-2 h-4 w-4" />
            New Product
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <ListToolbar
          search={search}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search by name or SKU..."
          className="bg-muted/40 rounded-lg px-3 py-2"
          filters={
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-8 w-[130px] text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={categoryFilter}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className="h-8 w-[160px] text-sm">
                  <SelectValue placeholder="Category" />
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
          }
        />

        {productsQuery.isLoading ? (
          <LoadingState variant="table" rows={8} />
        ) : productsQuery.error ? (
          <ErrorState
            title="Failed to load products"
            description={
              productsQuery.error.message === "Failed to load products"
                ? "We couldn't reach the products service. Check your connection and try again."
                : productsQuery.error.message
            }
            onRetry={handleRetry}
          />
        ) : items.length === 0 ? (
          <EmptyState
            illustration={<EmptyDocumentsIllustration />}
            title="No products found"
            description={
              search || statusFilter !== "all" || categoryFilter !== "all"
                ? "Try adjusting your search or filters."
                : "Add your first product to get started."
            }
            action={{
              label: "New Product",
              href: "/inventory/products/new",
            }}
          />
        ) : (
          <>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Name
                    </TableHead>
                    <TableHead className="w-[130px] px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                      SKU
                    </TableHead>
                    <TableHead className="w-[140px] px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                      Category
                    </TableHead>
                    <TableHead className="w-[80px] px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                      UOM
                    </TableHead>
                    <TableHead className="w-[120px] px-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                      Cost Price
                    </TableHead>
                    <TableHead className="w-[120px] px-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Price
                    </TableHead>
                    <TableHead className="w-[100px] px-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Stock
                    </TableHead>
                    <TableHead className="w-[90px] px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((product) => (
                    <TableRow
                      key={product.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="px-3 py-2">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                            <Package className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden="true" />
                          </div>
                          <Link
                            href={`/inventory/products/${product.id}`}
                            className="text-sm font-medium text-foreground hover:text-violet-600 hover:underline"
                          >
                            {product.name}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2 font-mono text-xs text-muted-foreground hidden md:table-cell">
                        {product.sku}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm text-muted-foreground hidden md:table-cell">
                        {product.category?.name ?? "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm text-muted-foreground hidden lg:table-cell">
                        {product.uom?.abbreviation ?? "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right text-sm tabular-nums text-muted-foreground hidden lg:table-cell">
                        {formatPrice(product.costPrice)}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right text-sm tabular-nums font-medium text-foreground">
                        {formatPrice(product.sellingPrice)}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right">
                        <StockBadge qty={product.totalStock ?? 0} />
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <Badge
                          variant={
                            product.status === "ACTIVE"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs px-1.5 py-0.5 rounded-md"
                        >
                          {product.status === "ACTIVE" ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/inventory/products/${product.id}`}>
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <DataTablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={PAGE_LIMIT}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </PageWrapper>
  );
}

function StockBadge({ qty }: { qty: number }) {
  if (qty <= 0) {
    return (
      <Badge
        variant="destructive"
        className="tabular-nums text-xs px-1.5 py-0.5 rounded-md"
      >
        Out of stock
      </Badge>
    );
  }
  if (qty < 10) {
    return (
      <Badge
        variant="outline"
        className="tabular-nums text-xs px-1.5 py-0.5 rounded-md border-amber-500/40 text-amber-600 bg-amber-50 dark:bg-amber-950"
      >
        {qty} low
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="tabular-nums text-xs px-1.5 py-0.5 rounded-md border-emerald-500/40 text-emerald-700 bg-emerald-50"
    >
      {qty}
    </Badge>
  );
}
