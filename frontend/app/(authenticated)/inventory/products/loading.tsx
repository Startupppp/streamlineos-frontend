import { InventoryListPageLoading } from "@/features/inventory/components/inventory-list-page-loading";

export default function ProductsLoading() {
  return (
    <InventoryListPageLoading
      title="Products"
      subtitle="Your product catalogue."
      actions={null}
      filterCount={1}
    />
  );
}
