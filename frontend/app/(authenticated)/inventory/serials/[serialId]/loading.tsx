import { InventoryDetailPageLoading } from "@/features/inventory/components/inventory-detail-page-loading";

export default function SerialDetailLoading() {
  return (
    <InventoryDetailPageLoading
      title="Serial Number"
      backHref="/inventory/serials"
      statCount={4}
    />
  );
}
