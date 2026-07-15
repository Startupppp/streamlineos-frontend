import { InventoryListPageLoading } from "@/features/inventory/components/inventory-list-page-loading";

export default function InventoryDashboardLoading() {
  return (
    <InventoryListPageLoading
      title="Dashboard"
      subtitle="Stock overview and recent activity."
      actions={null}
      filters={null}
      showStats
      statCols={4}
    />
  );
}
