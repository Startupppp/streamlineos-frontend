import { InventoryDetailPageLoading } from "@/features/inventory/components/inventory-detail-page-loading";

export default function VendorDetailLoading() {
  return (
    <InventoryDetailPageLoading
      title="Vendor"
      subtitle="Loading..."
      statCols={3}
      statCount={6}
      actions={null}
    />
  );
}
