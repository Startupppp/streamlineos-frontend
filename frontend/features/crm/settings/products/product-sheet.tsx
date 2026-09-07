"use client";

import { toast } from "sonner";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RecordForm, asRecordValue, type RecordFormValues } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { useCreateProduct, useUpdateProduct } from "@/hooks/api/crm/products";
import { getErrorMessage } from "@/lib/get-error-message";
import { PRODUCT_LAYOUT } from "@/lib/renderer/crm/settings/product-layout";
import type { CreateProductInput, Product, UpdateProductInput } from "@/types/crm/products";
import {
  flagOrOmit,
  numberOr,
  numberOrOmit,
  requiredText,
  textOrOmit,
} from "../shared/record-payload";

/**
 * Create and edit a product, rendered from the description.
 *
 * No schema sits beside this file and no field is written out twice. What the
 * form validates, what the catalogue table shows and what the detail view lists
 * are one description, so a field added to the product cannot appear in one and
 * not the others.
 *
 * The payload is assembled key by key rather than spread wholesale, because the
 * API wants numbers and a form hands back strings — and because a key the form
 * did not render must stay absent. `record-payload` holds that rule.
 */

interface ProductSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function ProductSheet({ open, onOpenChange, product }: ProductSheetProps) {
  const layout = useTenantLayout(PRODUCT_LAYOUT);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const isEditing = product !== null;
  const isPending = createProduct.isPending || updateProduct.isPending;

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit(values: RecordFormValues) {
    if (product) {
      const patch: UpdateProductInput = { id: product.id };
      const name = textOrOmit(values, "name");
      if (name !== undefined) patch.name = name;
      const sku = textOrOmit(values, "sku");
      if (sku !== undefined) patch.sku = sku;
      const category = textOrOmit(values, "category");
      if (category !== undefined) patch.category = category;
      const description = textOrOmit(values, "description");
      if (description !== undefined) patch.description = description;
      const unitPrice = numberOrOmit(values, "unitPrice");
      if (unitPrice !== undefined) patch.unitPrice = unitPrice;
      const currency = textOrOmit(values, "currency");
      if (currency !== undefined) patch.currency = currency;
      const taxRate = numberOrOmit(values, "taxRate");
      if (taxRate !== undefined) patch.taxRate = taxRate;
      const isActive = flagOrOmit(values, "isActive");
      if (isActive !== undefined) patch.isActive = isActive;

      updateProduct.mutate(patch, {
        onSuccess: () => {
          toast.success("Product updated");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
      return;
    }

    const payload: CreateProductInput = {
      name: requiredText(values, "name"),
      unitPrice: numberOr(values, "unitPrice", 0),
      sku: textOrOmit(values, "sku"),
      category: textOrOmit(values, "category"),
      description: textOrOmit(values, "description"),
      currency: textOrOmit(values, "currency"),
      taxRate: numberOrOmit(values, "taxRate"),
    };

    createProduct.mutate(payload, {
      onSuccess: () => {
        toast.success("Product created");
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>{isEditing ? "Edit product" : "New product"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update what this product costs and where it belongs in the catalogue."
              : "A product is a line you can put on a quote — its price, its tax and the currency it sells in."}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="px-6 py-5">
          <RecordForm
            key={product?.id ?? "new"}
            layout={layout}
            mode={isEditing ? "edit" : "create"}
            initial={product ? asRecordValue(product) : undefined}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            isSubmitting={isPending}
            submitLabel={isEditing ? "Save changes" : "Create product"}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
