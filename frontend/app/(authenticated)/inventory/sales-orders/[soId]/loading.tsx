import { InventoryDetailPageLoading } from "@/features/inventory/components/inventory-detail-page-loading";

export default function SalesOrderDetailLoading() {
  return (
    <InventoryDetailPageLoading
      title="Sales Order"
      backHref="/inventory/sales-orders"
      statCount={4}
    />
  );
}
