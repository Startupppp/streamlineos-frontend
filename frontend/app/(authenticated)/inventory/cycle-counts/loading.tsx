import { InventoryListPageLoading } from "@/features/inventory/components/inventory-list-page-loading";

export default function CycleCountsLoading() {
  return (
    <InventoryListPageLoading
      title="Cycle Counts"
      subtitle="Count inventory by location or category to verify stock accuracy."
      actions={null}
      filters={null}
    />
  );
}
