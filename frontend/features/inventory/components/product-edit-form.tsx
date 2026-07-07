"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useUpdateProduct, useCategories, useUom } from "@/hooks/api/inventory";
import { getErrorMessage } from "@/lib/get-error-message";

interface ProductForEdit {
  name: string;
  sku: string;
  description?: string | null;
  categoryId?: number | null;
  uomId?: number | null;
  costPrice?: string | number | null;
  sellingPrice?: string | number | null;
  reorderPoint?: number | string | null;
  status?: "ACTIVE" | "INACTIVE" | "DISCONTINUED";
  isActive?: boolean;
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
  isActive: z.string(),
});

type EditFormValues = z.infer<typeof editSchema>;

interface ProductEditFormProps {
  product: ProductForEdit;
  productId: number;
  onDone: () => void;
}

export function ProductEditForm({ product, productId, onDone }: ProductEditFormProps) {
  const updateMutation = useUpdateProduct();
  const categoriesQuery = useCategories();
  const uomQuery = useUom();

  const categories = categoriesQuery.data ?? [];
  const uomOptions = uomQuery.data ?? [];

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: product.name,
      sku: product.sku,
      description: product.description ?? "",
      categoryId: product.categoryId ? String(product.categoryId) : "",
      uomId: product.uomId ? String(product.uomId) : "",
      costPrice: product.costPrice != null ? String(product.costPrice) : "",
      sellingPrice: product.sellingPrice != null ? String(product.sellingPrice) : "",
      reorderPoint: product.reorderPoint != null ? String(product.reorderPoint) : "",
      isActive: (product.isActive ?? product.status === "ACTIVE") ? "true" : "false",
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
        sellingPrice: values.sellingPrice ? Number(values.sellingPrice) : undefined,
        reorderPoint: values.reorderPoint ? Number(values.reorderPoint) : undefined,
        status: values.isActive !== "false" ? "ACTIVE" : "INACTIVE",
      });
      toast.success("Product updated");
      onDone();
    } catch (error) {
      toast.error(getErrorMessage(error));
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
                  <Input type="number" step="0.01" min="0" className="tabular-nums" {...field} />
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
                  <Input type="number" step="0.01" min="0" className="tabular-nums" {...field} />
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
                  <Input type="number" step="1" min="0" className="tabular-nums" {...field} />
                </FormControl>
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
