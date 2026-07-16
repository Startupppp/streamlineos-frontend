import { InventoryDetailPageLoading } from "@/features/inventory/components/inventory-detail-page-loading";

export default function WarehouseDetailLoading() {
  return (
    <InventoryDetailPageLoading
      title="Warehouse"
      backHref="/inventory/warehouses"
      statCount={4}
    />
  );
}
