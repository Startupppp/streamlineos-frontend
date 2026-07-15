import { InventoryListPageLoading } from "@/features/inventory/components/inventory-list-page-loading";

export default function SalesOrdersLoading() {
  return (
    <InventoryListPageLoading
      title="Sales Orders"
      subtitle="Manage customer sales orders from creation to invoicing."
      filterCount={3}
    />
  );
}
