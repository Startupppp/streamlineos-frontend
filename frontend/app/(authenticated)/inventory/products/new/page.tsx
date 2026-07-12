"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { useCreateProduct } from "@/hooks/api/inventory";
import {
  NewProductForm,
  type ProductFormValues,
} from "@/features/inventory/components/new-product-form";

export default function NewProductPage() {
  const router = useRouter();
  const createMutation = useCreateProduct();

  async function onSubmit(values: ProductFormValues): Promise<void> {
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
      barcode: values.barcode || undefined,
      reorderEnabled: values.reorderEnabled,
      reorderPoint: values.reorderPoint ? Number(values.reorderPoint) : undefined,
    });
    toast.success("Product created successfully");
    router.push("/inventory/products");
  }

  function handleCancel(): void {
    router.push("/inventory/products");
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
      <NewProductForm
        onSubmit={onSubmit}
        onCancel={handleCancel}
        isPending={createMutation.isPending}
      />
    </PageWrapper>
  );
}
