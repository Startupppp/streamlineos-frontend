"use client";

import { use, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useProduct,
  useUpdateProduct,
  useCategories,
  useUom,
  useStockLevels,
  type StockLevelRow,
} from "@/lib/api/hooks/inventory";
import { ProductStatusBadge } from "@/features/inventory/products/ProductStatusBadge";
import type {
  InventoryProduct,
  InventoryCategory,
  InventoryUom,
} from "@/types/inventory";

interface ProductDetailPageProps {
  params: Promise<{ productId: string }>;
}

const editSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  uomId: z.string().optional(),
  costPrice: z
    .string()
    .optional()
    .refine(
      (v) => !v || (Number.isFinite(Number(v)) && Number(v) >= 0),
      "Must be a non-negative number"
    ),
  sellingPrice: z
    .string()
    .optional()
    .refine(
      (v) => !v || (Number.isFinite(Number(v)) && Number(v) >= 0),
      "Must be a non-negative number"
    ),
  reorderPoint: z
    .string()
    .optional()
    .refine(
      (v) => !v || (Number.isFinite(Number(v)) && Number(v) >= 0),
      "Must be a non-negative number"
    ),
});

type EditFormValues = z.infer<typeof editSchema>;

function formatPrice(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[11px] font-medium text-muted-foreground leading-none">
        {label}
      </p>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

function EditForm({
  product,
  categories,
  uomOptions,
  productId,
  onDone,
}: {
  product: InventoryProduct;
  categories: InventoryCategory[];
  uomOptions: InventoryUom[];
  productId: number;
  onDone: () => void;
}) {
  const updateMutation = useUpdateProduct();

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: product.name,
      sku: product.sku,
      description: product.description ?? "",
      categoryId: product.categoryId ? String(product.categoryId) : "",
      uomId: product.uomId ? String(product.uomId) : "",
      costPrice: String(Number(product.costPrice)),
      sellingPrice: String(Number(product.sellingPrice)),
      reorderPoint: String(Number(product.reorderPoint)),
    },
  });

  async function onSubmit(values: EditFormValues): Promise<void> {
    try {
      await updateMutation.mutateAsync({
        productId,
        name: values.name,
        sku: values.sku,
        description: values.description || undefined,
        categoryId: values.categoryId ? Number(values.categoryId) : undefined,
        uomId: values.uomId ? Number(values.uomId) : undefined,
        costPrice: values.costPrice ? Number(values.costPrice) : undefined,
        sellingPrice: values.sellingPrice
          ? Number(values.sellingPrice)
          : undefined,
        reorderPoint: values.reorderPoint
          ? Number(values.reorderPoint)
          : undefined,
      });
      toast.success("Product updated");
      onDone();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update product";
      toast.error(message);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU</FormLabel>
                <FormControl>
                  <Input className="font-mono" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="uomId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit of Measure</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select UOM" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {uomOptions.map((uom) => (
                      <SelectItem key={uom.id} value={String(uom.id)}>
                        {uom.name} ({uom.abbreviation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="sm:col-span-2">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="costPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="tabular-nums"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sellingPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selling Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="tabular-nums"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reorderPoint"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reorder Point</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    className="tabular-nums"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onDone}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { productId: productIdStr } = use(params);
  const productId = Number.parseInt(productIdStr, 10);

  const [editing, setEditing] = useState<boolean>(false);

  const productQuery = useProduct(productId);
  const categoriesQuery = useCategories();
  const uomQuery = useUom();
  const stockQuery = useStockLevels({ productId });

  const product = productQuery.data;
  const categories = categoriesQuery.data ?? [];
  const uomOptions = uomQuery.data ?? [];

  const stockItems: StockLevelRow[] = stockQuery.data?.items ?? [];

  function handleEditClick(): void {
    setEditing(true);
  }

  function handleEditDone(): void {
    setEditing(false);
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
                <EditForm
                  product={product}
                  categories={categories}
                  uomOptions={uomOptions}
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
                    value={product.category?.name ?? "—"}
                  />
                  <InfoRow
                    label="Unit of Measure"
                    value={product.uom?.name ?? "—"}
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
                    value={formatPrice(product.reorderPoint)}
                  />
                  <InfoRow
                    label="Status"
                    value={<ProductStatusBadge status={product.status} />}
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
              <Button size="sm" variant="outline">
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
                    action={{ label: "Add Variant", onClick: () => {} }}
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variants.map((variant) => (
                        <TableRow key={variant.id}>
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
                            <Badge
                              variant={
                                variant.isActive ? "default" : "secondary"
                              }
                            >
                              {variant.isActive ? "Active" : "Inactive"}
                            </Badge>
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
                    onRetry={() => stockQuery.refetch()}
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
                            {row.warehouseName ?? "—"}
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
    </PageWrapper>
  );
}
