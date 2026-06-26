"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
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
import { ListToolbar, LoadingState, ErrorState, DataTablePagination } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { useProducts, useCategories } from "@/lib/api/hooks/inventory";

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  categoryName?: string;
  uomName?: string;
  costPrice?: string | number | null;
  sellingPrice?: string | number | null;
  totalStock?: number | null;
  isActive: boolean;
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

  const isActive =
    statusFilter === "active"
      ? true
      : statusFilter === "inactive"
        ? false
        : undefined;

  const productsQuery = useProducts({
    search: search || undefined,
    isActive,
    categoryId: categoryFilter !== "all" ? Number(categoryFilter) : undefined,
    page,
    limit: PAGE_LIMIT,
  });

  const items = (productsQuery.data?.items ?? []) as Product[];
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
          filters={
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-9 w-[130px] text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={handleCategoryChange}>
                <SelectTrigger className="h-9 w-[160px] text-sm">
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
            description={productsQuery.error.message}
            onRetry={() => productsQuery.refetch()}
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
            <div className="rounded-xl border border-border/60 bg-card overflow-x-auto">
              <Table className="min-w-[860px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[130px]">SKU</TableHead>
                    <TableHead className="w-[140px]">Category</TableHead>
                    <TableHead className="w-[80px]">UOM</TableHead>
                    <TableHead className="w-[120px] text-right">Cost Price</TableHead>
                    <TableHead className="w-[120px] text-right">Selling Price</TableHead>
                    <TableHead className="w-[100px] text-right">Stock</TableHead>
                    <TableHead className="w-[90px]">Status</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Link
                          href={`/inventory/products/${product.id}`}
                          className="text-sm font-medium text-foreground hover:text-blue-600 hover:underline"
                        >
                          {product.name}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {product.sku}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {product.categoryName ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {product.uomName ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                        {formatPrice(product.costPrice)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums font-medium text-foreground">
                        {formatPrice(product.sellingPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <StockBadge qty={product.totalStock ?? 0} />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={product.isActive ? "default" : "secondary"}
                        >
                          {product.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
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
      <Badge variant="destructive" className="tabular-nums text-xs">
        Out of stock
      </Badge>
    );
  }
  if (qty < 10) {
    return (
      <Badge
        variant="outline"
        className="tabular-nums text-xs border-amber-500/40 text-amber-700 bg-amber-50"
      >
        {qty} low
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="tabular-nums text-xs border-emerald-500/40 text-emerald-700 bg-emerald-50"
    >
      {qty}
    </Badge>
  );
}
