import { InventoryListPageLoading } from "@/features/inventory/components/inventory-list-page-loading";

export default function VendorsLoading() {
  return (
    <InventoryListPageLoading
      title="Vendors"
      subtitle="Manage your suppliers and purchase order vendors."
      actions={null}
      filterCount={1}
    />
  );
}
