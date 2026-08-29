"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { NoPermissionState } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
import { useCreateProduct } from "@/hooks/api/inventory";
import {
  NewProductForm,
  type ProductFormValues,
} from "@/features/inventory/components/new-product-form";

export default function NewProductPage() {
  const canCreate = useCan("inventory:products:create");
  const router = useRouter();
  const createMutation = useCreateProduct();

  async function onSubmit(values: ProductFormValues): Promise<void> {
    const trimmedSku = values.sku.trim();
    const product = await createMutation.mutateAsync({
      name: values.name,
      ...(trimmedSku ? { sku: trimmedSku } : {}),
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
      barcode: values.barcode || undefined,
      reorderEnabled: values.reorderEnabled,
      reorderPoint: values.reorderPoint ? Number(values.reorderPoint) : undefined,
    });
    toast.success(`Product created (${product.sku})`);
    router.push("/inventory/products");
  }

  function handleCancel(): void {
    router.push("/inventory/products");
  }

  // G8. A create form is not a list, so it has no empty state — but it can
  // still be opened by somebody who may not save, and letting them fill it
  // in before the server refuses is the worst version of that. Placed after
  // every hook: an early return above one makes hook order depend on a
  // permission, which React forbids.
  if (!canCreate) {
    return (
      <PageWrapper title="New Product">
        <NoPermissionState permission="inventory:products:create" className="flex-1" />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="New Product"
      subtitle="Add a new product to your catalogue."
      backHref="/inventory/products"
      backLabel="Back to Products"
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <NewProductForm
          onSubmit={onSubmit}
          onCancel={handleCancel}
          isPending={createMutation.isPending}
        />
      </div>
    </PageWrapper>
  );
}
