"use client";

import { type ChangeEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { LoadingButton } from "@/components/ui/loading-button";
import { useUpdateProduct } from "@/hooks/api/inventory";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-client";
import { CategorySelect } from "@/features/inventory/components/product-field-selects";
import {
  ProductCostingFields,
  ProductUomFields,
  ProductReorderFields,
} from "@/features/inventory/components/product-edit-fields";
import {
  productNameSchema,
  productSkuSchema,
  productDescriptionSchema,
  NAME_MAX,
  SKU_MAX,
  DESCRIPTION_MAX,
} from "@/features/inventory/lib/new-product-schema";
import {
  productEditSchema,
  type EditFormValues,
} from "@/features/inventory/components/product-edit-schema";

interface ProductForEdit {
  name: string;
  sku: string;
  description?: string | null;
  categoryId?: number | null;
  uomId?: number | null;
  purchaseUomId?: number | null;
  salesUomId?: number | null;
  costPrice?: string | number | null;
  sellingPrice?: string | number | null;
  reorderPoint?: number | string | null;
  standardCost?: string | null;
  status?: "ACTIVE" | "INACTIVE" | "DISCONTINUED";
  isActive?: boolean;
  productType?: "STOCKABLE" | "CONSUMABLE" | "SERVICE" | null;
  trackingMethod?: "NONE" | "LOT" | "SERIAL" | null;
  costingMethod?: "STANDARD" | "WEIGHTED_AVERAGE" | "FIFO" | null;
  reorderEnabled?: boolean;
  barcode?: string | null;
}

interface ProductEditFormProps {
  product: ProductForEdit;
  productId: number;
  onDone: () => void;
}

export function ProductEditForm({ product, productId, onDone }: ProductEditFormProps) {
  const updateMutation = useUpdateProduct();

  const form = useForm<EditFormValues>({
    resolver: zodResolver(productEditSchema),
    defaultValues: {
      name: product.name,
      sku: product.sku,
      description: product.description ?? "",
      categoryId: product.categoryId != null ? String(product.categoryId) : "",
      uomId: product.uomId != null ? String(product.uomId) : "",
      purchaseUomId: product.purchaseUomId != null ? String(product.purchaseUomId) : "",
      salesUomId: product.salesUomId != null ? String(product.salesUomId) : "",
      costPrice: product.costPrice != null ? String(product.costPrice) : "",
      sellingPrice: product.sellingPrice != null ? String(product.sellingPrice) : "",
      reorderPoint: product.reorderPoint != null ? String(product.reorderPoint) : "",
      standardCost: product.standardCost ?? "",
      isActive: (product.isActive ?? product.status === "ACTIVE") ? "true" : "false",
      productType: product.productType ?? "STOCKABLE",
      trackingMethod: product.trackingMethod ?? "NONE",
      costingMethod: product.costingMethod ?? "WEIGHTED_AVERAGE",
      reorderEnabled: product.reorderEnabled ?? false,
      barcode: product.barcode ?? "",
    },
  });

  const costingMethod = form.watch("costingMethod");
  const reorderEnabled = form.watch("reorderEnabled");
  const baseUomValue = form.watch("uomId");
  const nameValue = useWatch({ control: form.control, name: "name" });
  const descriptionValue = useWatch({ control: form.control, name: "description" });

  async function onSubmit(values: EditFormValues): Promise<void> {
    try {
      await updateMutation.mutateAsync({
        productId,
        name: values.name,
        sku: values.sku,
        description: values.description || undefined,
        categoryId: values.categoryId ? Number(values.categoryId) : undefined,
        uomId: values.uomId ? Number(values.uomId) : undefined,
        purchaseUomId: values.purchaseUomId ? Number(values.purchaseUomId) : undefined,
        salesUomId: values.salesUomId ? Number(values.salesUomId) : undefined,
        costPrice: values.costPrice ? Number(values.costPrice) : undefined,
        sellingPrice: values.sellingPrice ? Number(values.sellingPrice) : undefined,
        reorderPoint: values.reorderPoint ? Number(values.reorderPoint) : undefined,
        standardCost: values.standardCost || undefined,
        status: values.isActive !== "false" ? "ACTIVE" : "INACTIVE",
        productType: values.productType,
        trackingMethod: values.trackingMethod,
        costingMethod: values.costingMethod,
        reorderEnabled: values.reorderEnabled,
        barcode: values.barcode || undefined,
      });
      toast.success("Product updated");
      onDone();
    } catch (error) {
      if (isApiError(error)) {
        const msg = error.message.toLowerCase();
        if (error.status === 409 && msg.includes("sku")) {
          form.setError("sku", { message: "A product with this SKU already exists." });
          form.setFocus("sku");
          return;
        }
        if (error.status === 400 && msg.includes("name")) {
          form.setError("name", { message: "Product name is required." });
          form.setFocus("name");
          return;
        }
      }
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Basic Information
          </p>
          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <div className="flex h-5 items-center">
                    <FormLabel>Name</FormLabel>
                  </div>
                  <FormControl>
                    <Input maxLength={NAME_MAX} {...field} />
                  </FormControl>
                  <div className="flex min-h-5 items-start justify-between gap-2">
                    <FormMessage />
                    <span className="ml-auto shrink-0 text-micro text-muted-foreground tabular-nums">
                      {(nameValue ?? "").length}/{NAME_MAX}
                    </span>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => {
                function onSkuInputChange(event: ChangeEvent<HTMLInputElement>): void {
                  field.onChange(event.target.value.toUpperCase());
                }

                return (
                  <FormItem className="min-w-0">
                    <div className="flex h-5 items-center">
                      <FormLabel>SKU</FormLabel>
                    </div>
                    <FormControl>
                      <Input
                        className="font-mono"
                        maxLength={SKU_MAX}
                        {...field}
                        onChange={onSkuInputChange}
                      />
                    </FormControl>
                    <div className="flex min-h-5 items-start">
                      <FormMessage />
                    </div>
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Category</FormLabel>
                  <CategorySelect value={field.value ?? ""} onChange={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="min-w-0">
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
            <FormField
              control={form.control}
              name="barcode"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Barcode</FormLabel>
                  <FormControl>
                    <Input className="font-mono" maxLength={100} placeholder="Scan or enter barcode" {...field} />
                  </FormControl>
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
                      <Textarea rows={3} maxLength={DESCRIPTION_MAX} {...field} />
                    </FormControl>
                    <div className="flex justify-between items-start">
                      <FormMessage />
                      <span className="text-micro text-muted-foreground ml-auto shrink-0">
                        {(descriptionValue ?? "").length}/{DESCRIPTION_MAX}
                      </span>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Classification
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="productType"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Product Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
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
                <FormItem className="min-w-0">
                  <FormLabel>Tracking Method</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      <SelectItem value="LOT">Lot / Batch</SelectItem>
                      <SelectItem value="SERIAL">Serial</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-micro text-muted-foreground mt-1">
                    Cannot change once stock exists
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <ProductCostingFields control={form.control} costingMethod={costingMethod} />

        <ProductUomFields
          control={form.control}
          baseUomValue={baseUomValue}
          setValue={form.setValue}
        />

        <ProductReorderFields control={form.control} reorderEnabled={reorderEnabled} />

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onDone}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <LoadingButton type="submit" isPending={updateMutation.isPending} loadingText="Saving…">
            Save changes
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}
