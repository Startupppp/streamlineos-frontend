import { InventoryDetailPageLoading } from "@/features/inventory/components/inventory-detail-page-loading";

export default function WarehouseDetailLoading() {
  return (
    <InventoryDetailPageLoading
      title="Warehouse"
      subtitle="Loading..."
      backHref="/inventory/warehouses"
      actions={null}
    />
  );
}
