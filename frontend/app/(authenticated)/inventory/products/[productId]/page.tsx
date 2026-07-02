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

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { productId: productIdStr } = use(params);
  const productId = Number.parseInt(productIdStr, 10);

  const [editing, setEditing] = useState<boolean>(false);
  const [addVariantOpen, setAddVariantOpen] = useState<boolean>(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariantForSheet | null>(null);

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
    return <LoadingState variant="page" />;
  }

  if (productQuery.error || !product || !Number.isInteger(productId)) {
    return (
      <ErrorState
        title="Product not found"
        description={
          productQuery.error?.message ??
          "This product does not exist or you do not have access."
        }
      />
    );
  }

  const variants = product.variants ?? [];
  const isProductActive = product.isActive ?? product.status === "ACTIVE";

  return (
    <PageWrapper
      eyebrow="Inventory · Products"
      title={product.name}
      subtitle={`SKU: ${product.sku}`}
      actions={
        <div className="flex items-center gap-2">
          {!editing && (
            <Button variant="outline" size="sm" onClick={handleEditClick}>
              <Pencil className="mr-1 h-4 w-4" />
              Edit
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/inventory/products">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Products
            </Link>
          </Button>
        </div>
      }
    >
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="variants">
            Variants {variants.length > 0 ? `(${variants.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardContent className="p-5">
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
                      <span className="tabular-nums">
                        {formatPrice(product.costPrice)}
                      </span>
                    }
                  />
                  <InfoRow
                    label="Selling Price"
                    value={
                      <span className="tabular-nums font-medium">
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
                      <Badge variant={isProductActive ? "default" : "secondary"}>
                        {isProductActive ? "Active" : "Inactive"}
                      </Badge>
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
                <Plus className="mr-1 h-4 w-4" />
                Add Variant
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {variants.length === 0 ? (
                <div className="px-5 pb-5">
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
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-[140px]">SKU</TableHead>
                        <TableHead className="w-[120px] text-right">
                          Cost Price
                        </TableHead>
                        <TableHead className="w-[120px] text-right">
                          Selling Price
                        </TableHead>
                        <TableHead className="w-[90px]">Status</TableHead>
                        <TableHead className="w-[48px]" />
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
                <div className="px-5 pb-5">
                  <LoadingState variant="table" rows={4} />
                </div>
              ) : stockQuery.error ? (
                <div className="px-5 pb-5">
                  <ErrorState
                    compact
                    title="Failed to load stock"
                    description={stockQuery.error.message}
                    onRetry={handleRetryStock}
                  />
                </div>
              ) : stockItems.length === 0 ? (
                <div className="px-5 pb-5">
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
                      <TableRow>
                        <TableHead>Warehouse</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="w-[120px] text-right">
                          Quantity
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockItems.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-sm font-medium text-foreground">
                            {row.warehouseName}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {row.locationCode ?? "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums font-medium">
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
    <TableRow>
      <TableCell className="text-sm font-medium text-foreground">
        {variant.name}
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">
        {variant.sku}
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
        {formatPrice(variant.costPrice)}
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums font-medium">
        {formatPrice(variant.sellingPrice)}
      </TableCell>
      <TableCell>
        <Badge variant={variant.isActive ? "default" : "secondary"}>
          {variant.isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell>
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
