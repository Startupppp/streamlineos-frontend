import { InventoryDetailPageLoading } from "@/features/inventory/components/inventory-detail-page-loading";

export default function PurchaseOrderDetailLoading() {
  return (
    <InventoryDetailPageLoading
      title="Purchase Order"
      backHref="/inventory/purchase-orders"
    />
  );
}
