"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LoadingState, ErrorState } from "@/components/shared";
import { useCategories, useUom, useCreateProduct } from "@/hooks/api/inventory";

interface Category {
  id: number;
  name: string;
}

interface UomOption {
  id: number;
  name: string;
  abbreviation: string;
}

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  isActive: z.string().optional(),
  productType: z.enum(["STOCKABLE", "CONSUMABLE", "SERVICE"]),
  trackingMethod: z.enum(["NONE", "LOT", "SERIAL"]),
  costingMethod: z.enum(["STANDARD", "WEIGHTED_AVERAGE", "FIFO"]),
  standardCost: z.string().optional().refine(
    (v) => !v || (Number.isFinite(Number(v)) && Number(v) >= 0),
    "Must be a non-negative number",
  ),
  costPrice: z.string().optional().refine(
    (v) => !v || (Number.isFinite(Number(v)) && Number(v) >= 0),
    "Must be a non-negative number",
  ),
  sellingPrice: z.string().optional().refine(
    (v) => !v || (Number.isFinite(Number(v)) && Number(v) >= 0),
    "Must be a non-negative number",
  ),
  uomId: z.string().optional(),
  purchaseUomId: z.string().optional(),
  salesUomId: z.string().optional(),
  reorderEnabled: z.boolean(),
  reorderPoint: z.string().optional().refine(
    (v) => !v || (Number.isFinite(Number(v)) && Number(v) >= 0),
    "Must be a non-negative number",
  ),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function NewProductPage() {
  const router = useRouter();
  const categoriesQuery = useCategories();
  const uomQuery = useUom();
  const createMutation = useCreateProduct();

  const categories: Category[] = categoriesQuery.data ?? [];
  const uomOptions: UomOption[] = uomQuery.data ?? [];

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      categoryId: "",
      isActive: "true",
      productType: "STOCKABLE",
      trackingMethod: "NONE",
      costingMethod: "STANDARD",
      standardCost: "",
      costPrice: "",
      sellingPrice: "",
      uomId: "",
      purchaseUomId: "",
      salesUomId: "",
      reorderEnabled: false,
      reorderPoint: "",
    },
  });

  const costingMethod = form.watch("costingMethod");

  async function onSubmit(values: ProductFormValues): Promise<void> {
    try {
      await createMutation.mutateAsync({
        name: values.name,
        sku: values.sku,
        description: values.description || undefined,
        categoryId: values.categoryId ? Number(values.categoryId) : undefined,
        status: values.isActive !== "false" ? "ACTIVE" : "INACTIVE",
        productType: values.productType,
        trackingMethod: values.trackingMethod,
        costingMethod: values.costingMethod,
        standardCost: values.standardCost || undefined,
        costPrice: values.costPrice ? Number(values.costPrice) : undefined,
        sellingPrice: values.sellingPrice ? Number(values.sellingPrice) : undefined,
        uomId: values.uomId ? Number(values.uomId) : undefined,
        purchaseUomId: values.purchaseUomId ? Number(values.purchaseUomId) : undefined,
        salesUomId: values.salesUomId ? Number(values.salesUomId) : undefined,
        reorderEnabled: values.reorderEnabled,
        reorderPoint: values.reorderPoint ? Number(values.reorderPoint) : undefined,
      });
      toast.success("Product created successfully");
      router.push("/inventory/products");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create product";
      toast.error(message);
    }
  }

  function handleCancel(): void {
    router.push("/inventory/products");
  }

  if (categoriesQuery.isLoading || uomQuery.isLoading) {
    return <LoadingState variant="form" rows={6} />;
  }

  if (categoriesQuery.error || uomQuery.error) {
    const errorMessage =
      categoriesQuery.error?.message ?? uomQuery.error?.message ?? "Could not load required data.";
    return <ErrorState title="Failed to load form data" description={errorMessage} />;
  }

  return (
    <PageWrapper
      eyebrow="Inventory · Products"
      title="New Product"
      subtitle="Add a new product to your catalogue."
      actions={
        <Button variant="ghost" size="sm" asChild>
          <Link href="/inventory/products">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Products
          </Link>
        </Button>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Product name" {...field} />
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
                      <Input placeholder="Unique stock-keeping unit" className="font-mono" {...field} />
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
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
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
                        <Textarea placeholder="Optional product description" rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">Classification</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="productType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="STOCKABLE">Stockable</SelectItem>
                        <SelectItem value="CONSUMABLE">Consumable</SelectItem>
                        <SelectItem value="SERVICE">Service</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="trackingMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tracking Method</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NONE">None</SelectItem>
                        <SelectItem value="LOT">Lot / Batch</SelectItem>
                        <SelectItem value="SERIAL">Serial</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">Cannot change once stock exists</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">Costing</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="costingMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costing Method</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="STANDARD">Standard</SelectItem>
                        <SelectItem value="WEIGHTED_AVERAGE">Weighted Average</SelectItem>
                        <SelectItem value="FIFO">FIFO</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">Cannot change once stock exists</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {costingMethod === "STANDARD" && (
                <FormField
                  control={form.control}
                  name="standardCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Standard Cost</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" className="tabular-nums" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">Pricing</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Price</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" className="tabular-nums" {...field} />
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
                      <Input type="number" step="0.01" min="0" placeholder="0.00" className="tabular-nums" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">Units of Measure</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="uomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base UOM</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select UOM" /></SelectTrigger>
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
              <FormField
                control={form.control}
                name="purchaseUomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase UOM</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Same as base" /></SelectTrigger>
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
              <FormField
                control={form.control}
                name="salesUomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sales UOM</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Same as base" /></SelectTrigger>
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
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">Sourcing & Reorder</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="reorderEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <FormLabel className="cursor-pointer">Enable Auto-Reorder</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
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
                      <Input type="number" step="1" min="0" placeholder="Min qty before reorder" className="tabular-nums" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Product"}
            </Button>
          </div>
        </form>
      </Form>
    </PageWrapper>
  );
}
