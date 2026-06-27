"use client";

import { type ChangeEvent } from "react";
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
import {
  useCategories,
  useUom,
  useCreateProduct,
} from "@/lib/api/hooks/inventory";

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
  isActive: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function NewProductPage() {
  const router = useRouter();
  const categoriesQuery = useCategories();
  const uomQuery = useUom();
  const createMutation = useCreateProduct();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      categoryId: "",
      uomId: "",
      costPrice: "",
      sellingPrice: "",
      reorderPoint: "",
      isActive: "true",
    },
  });

  const categories = (categoriesQuery.data ?? []) as Category[];
  const uomOptions = (uomQuery.data ?? []) as UomOption[];

  async function onSubmit(values: ProductFormValues): Promise<void> {
    try {
      await createMutation.mutateAsync({
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
        status: values.isActive !== "false" ? "ACTIVE" : "INACTIVE",
      });
      toast.success("Product created successfully");
      router.push("/inventory/products");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create product";
      toast.error(message);
    }
  }

  function handleCancel(): void {
    router.push("/inventory/products");
  }

  if (categoriesQuery.isLoading || uomQuery.isLoading) {
    return <LoadingState variant="form" rows={6} />;
  }

  if (categoriesQuery.error) {
    return (
      <ErrorState
        title="Failed to load form data"
        description={categoriesQuery.error.message}
      />
    );
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
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              Basic Information
            </h2>
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
                      <Input
                        placeholder="Unique stock-keeping unit"
                        className="font-mono"
                        {...field}
                      />
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
                      value={field.value}
                      onValueChange={field.onChange}
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
              <FormField
                control={form.control}
                name="uomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit of Measure</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
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
                        <Textarea
                          placeholder="Optional product description"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
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
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              Pricing
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        placeholder="0.00"
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
                        placeholder="0.00"
                        className="tabular-nums"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              Reorder Settings
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        placeholder="Min qty before reorder"
                        className="tabular-nums"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={createMutation.isPending}
            >
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
