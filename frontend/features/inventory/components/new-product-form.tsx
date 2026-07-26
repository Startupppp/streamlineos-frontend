"use client";

import { useState, type ChangeEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { isApiError } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { ProductBasicFields } from "@/features/inventory/components/product-basic-fields";
import { ProductClassificationFields } from "@/features/inventory/components/product-classification-fields";
import { ProductCostingCardFields } from "@/features/inventory/components/product-costing-fields";
import { ProductPricingFields } from "@/features/inventory/components/product-pricing-fields";
import { ProductUomCardFields } from "@/features/inventory/components/product-uom-card-fields";
import { ProductReorderCardFields } from "@/features/inventory/components/product-reorder-card-fields";
import {
  productSchema,
  type ProductFormValues,
  NAME_MAX,
  SKU_MIN,
  SKU_MAX,
  DESCRIPTION_MAX,
  SKU_PATTERN,
  DECIMAL_PATTERN,
  CONTAINS_ALPHANUMERIC,
  productNameSchema,
  productSkuSchema,
  productSkuOptionalSchema,
  productDescriptionSchema,
} from "@/features/inventory/lib/new-product-schema";

export {
  productSchema,
  productNameSchema,
  productSkuSchema,
  productSkuOptionalSchema,
  productDescriptionSchema,
  SKU_PATTERN,
  DECIMAL_PATTERN,
  CONTAINS_ALPHANUMERIC,
  NAME_MAX,
  SKU_MIN,
  SKU_MAX,
  DESCRIPTION_MAX,
};
export type { ProductFormValues };

interface NewProductFormProps {
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
}

export function NewProductForm({
  onSubmit,
  onCancel,
  isPending,
}: NewProductFormProps) {
  const [skuAuto, setSkuAuto] = useState(true);

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
      barcode: "",
      reorderEnabled: false,
      reorderPoint: "",
    },
  });

  const costingMethod = form.watch("costingMethod");
  const reorderEnabled = form.watch("reorderEnabled");
  const baseUomValue = form.watch("uomId");
  const nameValue = useWatch({ control: form.control, name: "name" });
  const descriptionValue = useWatch({
    control: form.control,
    name: "description",
  });

  function handleCustomizeSku(): void {
    setSkuAuto(false);
    queueMicrotask(() => {
      form.setFocus("sku");
    });
  }

  function handleResetSkuAuto(): void {
    setSkuAuto(true);
    form.setValue("sku", "", { shouldValidate: true, shouldDirty: true });
    form.clearErrors("sku");
  }

  function handleSkuChange(
    event: ChangeEvent<HTMLInputElement>,
    onChange: (value: string) => void,
  ): void {
    setSkuAuto(false);
    onChange(event.target.value.toUpperCase());
  }

  async function handleSubmit(values: ProductFormValues): Promise<void> {
    try {
      await onSubmit({
        ...values,
        sku: skuAuto ? "" : values.sku,
      });
    } catch (error) {
      if (isApiError(error)) {
        const msg = error.message.toLowerCase();
        if (error.status === 409 && msg.includes("sku")) {
          setSkuAuto(false);
          form.setError("sku", {
            message: "A product with this SKU already exists.",
          });
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
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4 pb-4"
      >
        <ProductBasicFields
          control={form.control}
          skuAuto={skuAuto}
          nameValue={nameValue}
          descriptionValue={descriptionValue}
          onCustomizeSku={handleCustomizeSku}
          onResetSkuAuto={handleResetSkuAuto}
          onSkuChange={handleSkuChange}
          setValue={form.setValue}
          setFocus={form.setFocus}
          clearErrors={form.clearErrors}
        />

        <ProductClassificationFields control={form.control} />

        <ProductCostingCardFields
          control={form.control}
          costingMethod={costingMethod}
        />

        <ProductPricingFields control={form.control} />

        <ProductUomCardFields
          control={form.control}
          baseUomValue={baseUomValue}
          setValue={form.setValue}
        />

        <ProductReorderCardFields
          control={form.control}
          reorderEnabled={reorderEnabled}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            isPending={isPending}
            loadingText="Creating…"
          >
            Create Product
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}
