import { InventoryDetailPageLoading } from "@/features/inventory/components/inventory-detail-page-loading";

export default function SerialDetailLoading() {
  return (
    <InventoryDetailPageLoading
      title="Loading…"
      backHref="/inventory/serials"
      actions={null}
    />
  );
}
