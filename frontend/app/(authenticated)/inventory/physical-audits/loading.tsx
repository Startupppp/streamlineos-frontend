import { InventoryListPageLoading } from "@/features/inventory/components/inventory-list-page-loading";

export default function PhysicalAuditsLoading() {
  return (
    <InventoryListPageLoading
      title="Physical Audits"
      subtitle="Warehouse-wide full stock audits."
      actions={null}
      filters={null}
    />
  );
}
