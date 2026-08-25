"use client";

import { use, useState, type ReactNode } from "react";
import { Pencil } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
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
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingState, ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { useProduct, useStockLevels, type StockLevelRow } from "@/hooks/api/inventory";
import { ProductEditForm } from "@/features/inventory/components/product-edit-form";
import { ProductAiActions } from "@/features/inventory/components/product-ai-actions";
import {
  AddVariantSheet,
  EditVariantSheet,
  type ProductVariantForSheet,
} from "@/features/inventory/components/product-variant-sheet";

interface ProductDetailPageProps {
  params: Promise<{ productId: string }>;
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
      <p className="text-dense font-medium text-muted-foreground leading-none">
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
        className="h-5 text-micro px-2 py-0 border-status-success-rule text-status-success-ink bg-status-success-surface"
      >
        Active
      </Badge>
    );
  }
  if (effectiveStatus === "DISCONTINUED") {
    return (
      <Badge
        variant="outline"
        className="h-5 text-micro px-2 py-0 border-status-warning-rule text-status-warning-ink bg-status-warning-surface"
      >
        Discontinued
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="h-5 text-micro px-2 py-0 border-border text-muted-foreground bg-muted"
    >
      Inactive
    </Badge>
  );
}

interface VariantEditCellProps {
  variant: ProductVariantForSheet;
  onEdit: (v: ProductVariantForSheet) => void;
}

function VariantEditCell({ variant, onEdit }: VariantEditCellProps) {
  function handleClick(): void {
    onEdit(variant);
  }
  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-7"
      onClick={handleClick}
      aria-label={`Edit variant ${variant.name}`}
    >
      <Pencil className="h-3.5 w-3.5" />
    </Button>
  );
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { productId: productIdStr } = use(params);
  const productId = Number.parseInt(productIdStr, 10);

  const [editing, setEditing] = useState<boolean>(false);
  const [addVariantOpen, setAddVariantOpen] = useState<boolean>(false);
  const [editingVariant, setEditingVariant] =
    useState<ProductVariantForSheet | null>(null);

  const productQuery = useProduct(productId);
  const stockQuery = useStockLevels({ productId });

  const product = productQuery.data;
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
        title="Product"
        backHref="/inventory/products"
        backLabel="Back to Products"
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <LoadingState variant="page" />
        </div>
      </PageWrapper>
    );
  }

  if (productQuery.error || !product || !Number.isInteger(productId)) {
    return (
      <PageWrapper
        title="Product"
        backHref="/inventory/products"
        backLabel="Back to Products"
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          <ErrorState
            title="Product not found"
            description={
              productQuery.error != null
                ? getErrorMessage(productQuery.error)
                : "This product does not exist or you do not have access."
            }
            className="min-h-[40dvh]"
          />
        </div>
      </PageWrapper>
    );
  }

  const variants = product.variants ?? [];

  const variantColumns: DataTableColumn<ProductVariantForSheet>[] = [
    {
      key: "name",
      header: "Name",
      cell: (v) => (
        <span className="font-medium text-foreground">{v.name}</span>
      ),
    },
    {
      key: "sku",
      header: "SKU",
      headerClassName: "w-[140px]",
      className: "font-mono tabular-nums text-muted-foreground",
      cell: (v) => v.sku,
    },
    {
      key: "costPrice",
      header: "Cost Price",
      headerClassName: "w-[120px] text-right",
      className: "text-right font-mono tabular-nums text-muted-foreground",
      cell: (v) => formatPrice(v.costPrice),
    },
    {
      key: "sellingPrice",
      header: "Selling Price",
      headerClassName: "w-[120px] text-right",
      className: "text-right font-mono tabular-nums font-medium",
      cell: (v) => formatPrice(v.sellingPrice),
    },
    {
      key: "status",
      header: "Status",
      headerClassName: "w-[90px]",
      cell: (v) => (
        <Badge
          variant="outline"
          className={`h-4 text-micro px-1.5 py-0 ${v.isActive ? "border-status-success-rule text-status-success-ink bg-status-success-surface" : "border-border text-muted-foreground bg-muted"}`}
        >
          {v.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-8",
      cell: (v) => (
        <VariantEditCell variant={v} onEdit={handleEditVariantClick} />
      ),
    },
  ];

  const stockColumns: DataTableColumn<StockLevelRow>[] = [
    {
      key: "warehouse",
      header: "Warehouse",
      cell: (row) => (
        <span className="font-medium text-foreground">
          {row.warehouseName ?? "—"}
        </span>
      ),
    },
    {
      key: "location",
      header: "Location",
      cell: (row) => (
        <span className="text-muted-foreground">{row.locationCode ?? "—"}</span>
      ),
    },
    {
      key: "onHand",
      header: "Quantity",
      headerClassName: "w-[120px] text-right",
      className: "text-right font-mono tabular-nums font-medium",
      cell: (row) => row.onHand,
    },
  ];

  return (
    <PageWrapper
      title={product.name}
      subtitle={`SKU: ${product.sku}`}
      backHref="/inventory/products"
      backLabel="Back to Products"
      actions={
        <div className="flex items-center gap-2">
          {!editing && (
            <Button variant="outline" size="sm" onClick={handleEditClick}>
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit
            </Button>
          )}
          <ProductAiActions product={product} />
        </div>
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
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
                  <InfoRow label="Product Type" value={
                    product.productType === "STOCKABLE" ? "Stockable"
                    : product.productType === "CONSUMABLE" ? "Consumable"
                    : product.productType === "SERVICE" ? "Service" : "—"
                  } />
                  <InfoRow label="Tracking" value={
                    product.trackingMethod === "NONE" ? "None"
                    : product.trackingMethod === "LOT" ? "Lot / Batch"
                    : product.trackingMethod === "SERIAL" ? "Serial" : "—"
                  } />
                  <InfoRow label="Costing Method" value={
                    product.costingMethod === "STANDARD" ? "Standard"
                    : product.costingMethod === "WEIGHTED_AVERAGE" ? "Weighted Avg"
                    : product.costingMethod === "FIFO" ? "FIFO" : "—"
                  } />
                  <InfoRow
                    label="Standard Cost"
                    value={product.standardCost != null
                      ? <span className="font-mono tabular-nums">{formatPrice(product.standardCost)}</span>
                      : "—"}
                  />
                  <InfoRow label="Reorder Enabled" value={product.reorderEnabled ? "Yes" : "No"} />
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
              <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1" size="sm" variant="outline" onClick={handleAddVariantClick}>
                Add Variant
              </AnimatedIconButton>
            </CardHeader>
            <CardContent className="p-0">
              {variants.length === 0 ? (
                <div className="px-4 pb-4">
                  <InventoryEmptyState
                    compact
                    title="No variants"
                    description="Add variants like size or colour to this product."
                  />
                </div>
              ) : (
                <DataTable
                  data={variants}
                  columns={variantColumns}
                  getRowKey={(v) => v.id}
                  minWidth="560px"
                />
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
                  <LoadingState variant="table" rows={12} />
                </div>
              ) : stockQuery.error ? (
                <div className="px-4 pb-4">
                  <ErrorState
                    compact
                    title="Failed to load stock"
                    description={getErrorMessage(stockQuery.error)}
                    onRetry={handleRetryStock}
                  />
                </div>
              ) : stockItems.length === 0 ? (
                <div className="px-4 pb-4">
                  <InventoryEmptyState
                    compact
                    title="No stock records"
                    description="Stock will appear here once inventory is adjusted."
                  />
                </div>
              ) : (
                <DataTable
                  data={stockItems}
                  columns={stockColumns}
                  getRowKey={(row) => row.id}
                  minWidth="360px"
                />
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
      </div>
    </PageWrapper>
  );
}
