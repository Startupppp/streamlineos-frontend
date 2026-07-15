import { InventoryListPageLoading } from "@/features/inventory/components/inventory-list-page-loading";

export default function ExpiryLoading() {
  return (
    <InventoryListPageLoading
      title="Expiry Management"
      subtitle="Monitor stock approaching or past expiry dates."
      actions={null}
      filterCount={2}
    />
  );
}
