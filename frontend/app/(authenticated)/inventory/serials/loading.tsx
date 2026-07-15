import { InventoryListPageLoading } from "@/features/inventory/components/inventory-list-page-loading";

export default function SerialsLoading() {
  return (
    <InventoryListPageLoading
      title="Serial Numbers"
      subtitle="Track individual serial numbers and their history."
      actions={null}
      filterCount={2}
    />
  );
}
