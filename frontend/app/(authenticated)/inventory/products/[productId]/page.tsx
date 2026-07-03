"use client";

import { use, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, Pencil, Plus } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { useProduct, useStockLevels } from "@/hooks/api/inventory";
import { ProductEditForm } from "@/features/inventory/components/product-edit-form";
import {
  AddVariantSheet,
  EditVariantSheet,
  type ProductVariantForSheet,
} from "@/features/inventory/components/product-variant-sheet";

interface ProductDetailPageProps {
  params: Promise<{ productId: string }>;
}

interface ProductVariant {
  id: number;
  name: string;
  sku: string;
  barcode?: string | null;
  costPrice?: string | number | null;
  sellingPrice?: string | number | null;
  isActive: boolean;
}

interface ProductDetail {
  id: number;
  name: string;
  sku: string;
  description?: string | null;
  categoryId?: number | null;
  categoryName?: string | null;
  uomId?: number | null;
  uomName?: string | null;
  costPrice?: string | number | null;
  sellingPrice?: string | number | null;
  reorderPoint?: number | string | null;
  status?: "ACTIVE" | "INACTIVE" | "DISCONTINUED";
  isActive?: boolean;
  variants?: ProductVariant[];
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

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[11px] font-medium text-muted-foreground leading-none">
        {label}
      </p>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

function ProductStatusBadge({
  status,
  isActive,
}: {
  status?: string;
  isActive?: boolean;
}) {
  const effectiveStatus = status ?? (isActive ? "ACTIVE" : "INACTIVE");
  if (effectiveStatus === "ACTIVE") {
    return (
      <Badge
        variant="outline"
        className="h-5 text-[10px] px-2 py-0 border-emerald-200 text-emerald-700 bg-emerald-50"
      >
        Active
      </Badge>
    );
  }
  if (effectiveStatus === "DISCONTINUED") {
    return (
      <Badge
        variant="outline"
        className="h-5 text-[10px] px-2 py-0 border-amber-200 text-amber-700 bg-amber-50"
      >
        Discontinued
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="h-5 text-[10px] px-2 py-0 border-slate-200 text-slate-600 bg-slate-100"
    >
      Inactive
    </Badge>
  );
}

const BACK_LINK = (
  <Button variant="ghost" size="sm" asChild>
    <Link href="/inventory/products">
      <ChevronLeft className="mr-1 h-3.5 w-3.5" />
      Back to Products
    </Link>
  </Button>
);

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { productId: productIdStr } = use(params);
  const productId = Number.parseInt(productIdStr, 10);

  const [editing, setEditing] = useState<boolean>(false);
  const [addVariantOpen, setAddVariantOpen] = useState<boolean>(false);
  const [editingVariant, setEditingVariant] =
    useState<ProductVariantForSheet | null>(null);

  const productQuery = useProduct(productId);
  const stockQuery = useStockLevels({ productId });

  const product = productQuery.data as ProductDetail | undefined;
  const stockItems = stockQuery.data?.items ?? [];

  function handleEditClick(): void {
    setEditing(true);
  }

  function handleEditDone(): void {
    setEditing(false);
  }

  function handleAddVariantClick(): void {
    setAddVariantOpen(true);
  }

  function handleEditVariantClick(variant: ProductVariantForSheet): void {
    setEditingVariant(variant);
  }

  function handleEditVariantOpenChange(next: boolean): void {
    if (!next) setEditingVariant(null);
  }

  function handleRetryStock(): void {
    void stockQuery.refetch();
  }

  if (productQuery.isLoading) {
    return (
      <PageWrapper
        eyebrow="Inventory · Products"
        title="Product"
        actions={BACK_LINK}
      >
        <LoadingState variant="page" />
      </PageWrapper>
    );
  }

  if (productQuery.error || !product || !Number.isInteger(productId)) {
    return (
      <PageWrapper
        eyebrow="Inventory · Products"
        title="Product"
        actions={BACK_LINK}
      >
        <ErrorState
          title="Product not found"
          description={
            productQuery.error?.message ??
            "This product does not exist or you do not have access."
          }
          className="min-h-[40vh]"
        />
      </PageWrapper>
    );
  }

  const variants = product.variants ?? [];

  return (
    <PageWrapper
      eyebrow="Inventory · Products"
      title={product.name}
      subtitle={`SKU: ${product.sku}`}
      actions={
        <div className="flex items-center gap-2">
          {!editing && (
            <Button variant="outline" size="sm" onClick={handleEditClick}>
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit
            </Button>
          )}
          {BACK_LINK}
        </div>
      }
    >
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="variants">
            Variants{variants.length > 0 ? ` (${variants.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardContent className="p-4">
              {editing ? (
                <ProductEditForm
                  product={product}
                  productId={productId}
                  onDone={handleEditDone}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <InfoRow label="Name" value={product.name} />
                  <InfoRow
                    label="SKU"
                    value={
                      <span className="font-mono text-xs">{product.sku}</span>
                    }
                  />
                  <InfoRow
                    label="Category"
                    value={product.categoryName ?? "—"}
                  />
                  <InfoRow
                    label="Unit of Measure"
                    value={product.uomName ?? "—"}
                  />
                  <InfoRow
                    label="Cost Price"
                    value={
                      <span className="font-mono tabular-nums">
                        {formatPrice(product.costPrice)}
                      </span>
                    }
                  />
                  <InfoRow
                    label="Selling Price"
                    value={
                      <span className="font-mono tabular-nums font-medium">
                        {formatPrice(product.sellingPrice)}
                      </span>
                    }
                  />
                  <InfoRow
                    label="Reorder Point"
                    value={
                      product.reorderPoint != null
                        ? String(product.reorderPoint)
                        : "—"
                    }
                  />
                  <InfoRow
                    label="Status"
                    value={
                      <ProductStatusBadge
                        status={product.status}
                        isActive={product.isActive}
                      />
                    }
                  />
                  {product.description && (
                    <div className="sm:col-span-2 lg:col-span-3">
                      <InfoRow
                        label="Description"
                        value={
                          <p className="text-muted-foreground leading-relaxed">
                            {product.description}
                          </p>
                        }
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variants">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold">Variants</CardTitle>
              <Button size="sm" variant="outline" onClick={handleAddVariantClick}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Variant
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {variants.length === 0 ? (
                <div className="px-4 pb-4">
                  <EmptyState
                    compact
                    title="No variants"
                    description="Add variants like size or colour to this product."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 bg-muted/80">
                          Name
                        </TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 bg-muted/80 w-[140px]">
                          SKU
                        </TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 bg-muted/80 w-[120px] text-right">
                          Cost Price
                        </TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 bg-muted/80 w-[120px] text-right">
                          Selling Price
                        </TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 bg-muted/80 w-[90px]">
                          Status
                        </TableHead>
                        <TableHead className="bg-muted/80 w-8" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variants.map((variant) => (
                        <VariantRow
                          key={variant.id}
                          variant={variant}
                          onEdit={handleEditVariantClick}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Stock by Location
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {stockQuery.isLoading ? (
                <div className="px-4 pb-4">
                  <LoadingState variant="table" rows={4} />
                </div>
              ) : stockQuery.error ? (
                <div className="px-4 pb-4">
                  <ErrorState
                    compact
                    title="Failed to load stock"
                    description={stockQuery.error.message}
                    onRetry={handleRetryStock}
                  />
                </div>
              ) : stockItems.length === 0 ? (
                <div className="px-4 pb-4">
                  <EmptyState
                    compact
                    title="No stock records"
                    description="Stock will appear here once inventory is adjusted."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 bg-muted/80">
                          Warehouse
                        </TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 bg-muted/80">
                          Location
                        </TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 bg-muted/80 w-[120px] text-right">
                          Quantity
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockItems.map((row) => (
                        <TableRow
                          key={row.id}
                          className="h-8 hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="px-2 py-1 text-[11px] font-medium text-foreground">
                            {row.warehouseName}
                          </TableCell>
                          <TableCell className="px-2 py-1 text-[11px] text-muted-foreground">
                            {row.locationCode ?? "—"}
                          </TableCell>
                          <TableCell className="px-2 py-1 text-[11px] text-right font-mono tabular-nums font-medium">
                            {row.onHand}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddVariantSheet
        productId={productId}
        open={addVariantOpen}
        onOpenChange={setAddVariantOpen}
      />
      <EditVariantSheet
        key={editingVariant?.id ?? "edit-closed"}
        productId={productId}
        variant={editingVariant}
        open={editingVariant !== null}
        onOpenChange={handleEditVariantOpenChange}
      />
    </PageWrapper>
  );
}

interface VariantRowProps {
  variant: ProductVariantForSheet;
  onEdit: (variant: ProductVariantForSheet) => void;
}

function VariantRow({ variant, onEdit }: VariantRowProps) {
  function handleEditClick(): void {
    onEdit(variant);
  }

  return (
    <TableRow className="h-8 hover:bg-muted/30 transition-colors">
      <TableCell className="px-2 py-1 text-[11px] font-medium text-foreground">
        {variant.name}
      </TableCell>
      <TableCell className="px-2 py-1 text-[11px] font-mono tabular-nums text-muted-foreground">
        {variant.sku}
      </TableCell>
      <TableCell className="px-2 py-1 text-[11px] text-right font-mono tabular-nums text-muted-foreground">
        {formatPrice(variant.costPrice)}
      </TableCell>
      <TableCell className="px-2 py-1 text-[11px] text-right font-mono tabular-nums font-medium">
        {formatPrice(variant.sellingPrice)}
      </TableCell>
      <TableCell className="px-2 py-1">
        <Badge
          variant="outline"
          className={`h-4 text-[9px] px-1.5 py-0 ${variant.isActive ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-slate-200 text-slate-600 bg-slate-100"}`}
        >
          {variant.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell className="px-2 py-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleEditClick}
          aria-label={`Edit variant ${variant.name}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
