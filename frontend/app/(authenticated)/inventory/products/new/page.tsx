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
import { isMaterialFamily } from "@/features/inventory/lib/new-product-schema";

export default function NewProductPage() {
  const canCreate = useCan("inventory:products:create");
  const router = useRouter();
  const createMutation = useCreateProduct();

  async function onSubmit(values: ProductFormValues): Promise<void> {
    const trimmedSku = values.sku.trim();
    const materialFamily = values.materialFamily;
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
      // B1. Only sent when filled in: an empty box is "not answered", and the
      // server refuses every one of these outright while the pack is off, so a
      // blank string would turn a create into a named 400.
      ...(values.brand ? { brand: values.brand } : {}),
      ...(values.materialGrade ? { materialGrade: values.materialGrade } : {}),
      ...(values.finish ? { finish: values.finish } : {}),
      ...(values.colour ? { colour: values.colour } : {}),
      ...(values.dimensionLabel ? { dimensionLabel: values.dimensionLabel } : {}),
      ...(materialFamily && isMaterialFamily(materialFamily) ? { materialFamily } : {}),
      ...(values.packSize ? { packSize: values.packSize } : {}),
      ...(values.supplierCode ? { supplierCode: values.supplierCode } : {}),
      ...(values.leadTimeDays ? { leadTimeDays: Number(values.leadTimeDays) } : {}),
      ...(values.reorderQuantity ? { reorderQuantity: values.reorderQuantity } : {}),
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
