"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  useCreateProduct,
  useUpdateProduct,
  useProductCategories,
  useProductUoms,
} from "@/lib/api/hooks/inventory";
import type { InventoryProduct } from "@/types/inventory";

const productFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  sku: z.string().min(1, "SKU is required").max(100),
  barcode: z.string().max(100).optional().or(z.literal("")),
  categoryId: z.coerce.number().int().positive().optional(),
  uomId: z.coerce.number().int().positive().optional(),
  description: z.string().optional().or(z.literal("")),
  costPrice: z.coerce.number().nonnegative("Must be 0 or more").default(0),
  sellingPrice: z.coerce.number().nonnegative("Must be 0 or more").default(0),
  reorderPoint: z.coerce.number().nonnegative("Must be 0 or more").default(0),
  hasVariants: z.boolean().default(false),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  product?: InventoryProduct;
  onSuccess?: (product: InventoryProduct) => void;
}

export function ProductForm({ product, onSuccess }: ProductFormProps) {
  const isEdit = !!product;

  const { data: categories = [] } = useProductCategories();
  const { data: uoms = [] } = useProductUoms();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct(product?.id ?? 0);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      barcode: "",
      categoryId: undefined,
      uomId: undefined,
      description: "",
      costPrice: 0,
      sellingPrice: 0,
      reorderPoint: 0,
      hasVariants: false,
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode ?? "",
        categoryId: product.categoryId ?? undefined,
        uomId: product.uomId ?? undefined,
        description: product.description ?? "",
        costPrice: Number(product.costPrice),
        sellingPrice: Number(product.sellingPrice),
        reorderPoint: Number(product.reorderPoint),
        hasVariants: product.hasVariants,
      });
    }
  }, [product, form]);

  function handleSubmit(values: ProductFormValues) {
    const payload = {
      name: values.name,
      sku: values.sku,
      barcode: values.barcode || undefined,
      categoryId: values.categoryId,
      uomId: values.uomId,
      description: values.description || undefined,
      costPrice: values.costPrice,
      sellingPrice: values.sellingPrice,
      reorderPoint: values.reorderPoint,
      hasVariants: values.hasVariants,
    };

    if (isEdit) {
      updateProduct.mutate(payload, {
        onSuccess: (updated) => {
          toast.success("Product updated");
          onSuccess?.(updated);
        },
        onError: () => toast.error("Failed to update product"),
      });
    } else {
      createProduct.mutate(payload, {
        onSuccess: (created) => {
          toast.success("Product created");
          form.reset();
          onSuccess?.(created);
        },
        onError: () => toast.error("Failed to create product"),
      });
    }
  }

  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Name <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Steel Rod 12mm" {...field} />
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
                <FormLabel>
                  SKU <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. STL-ROD-12" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="barcode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Barcode</FormLabel>
                <FormControl>
                  <Input placeholder="EAN / UPC barcode" {...field} />
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
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
                >
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="uomId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit of Measure</FormLabel>
                <Select
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select UOM" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {uoms.map((uom) => (
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
            name="reorderPoint"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reorder Point</FormLabel>
                <FormControl>
                  <Input type="number" min={0} step="0.01" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Product description (optional)"
                  className="min-h-[80px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="costPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost Price</FormLabel>
                <FormControl>
                  <Input type="number" min={0} step="0.01" placeholder="0.00" {...field} />
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
                  <Input type="number" min={0} step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="hasVariants"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div>
                <FormLabel className="text-sm font-medium">Has Variants</FormLabel>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enable if this product comes in multiple sizes, colors, or options
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-label="Toggle product variants"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {!isPending && <Save className="h-4 w-4 mr-2" />}
            {isEdit ? "Save Changes" : "Create Product"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
