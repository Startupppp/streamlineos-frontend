import { InventoryListPageLoading } from "@/features/inventory/components/inventory-list-page-loading";

export default function LotsLoading() {
  return (
    <InventoryListPageLoading
      title="Lots"
      subtitle="Track lot numbers, expiry dates, and stock by lot."
      actions={null}
      filterCount={3}
    />
  );
}
