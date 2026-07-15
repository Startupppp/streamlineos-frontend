import { InventoryListPageLoading } from "@/features/inventory/components/inventory-list-page-loading";

export default function PurchaseOrdersLoading() {
  return (
    <InventoryListPageLoading
      title="Purchase Orders"
      filterCount={3}
    />
  );
}
