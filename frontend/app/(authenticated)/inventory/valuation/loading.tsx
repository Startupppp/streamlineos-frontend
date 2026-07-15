import { InventoryListPageLoading } from "@/features/inventory/components/inventory-list-page-loading";

export default function ValuationLoading() {
  return (
    <InventoryListPageLoading
      title="Inventory Valuation"
      subtitle="Total stock value by costing method."
      actions={null}
      filters={null}
      showStats
      statCols={4}
    />
  );
}
