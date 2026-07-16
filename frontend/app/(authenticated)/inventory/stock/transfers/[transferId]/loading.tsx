import { InventoryDetailPageLoading } from "@/features/inventory/components/inventory-detail-page-loading";

export default function TransferDetailLoading() {
  return (
    <InventoryDetailPageLoading
      title="Transfer"
      subtitle="Transfer details."
      backHref="/inventory/stock/transfers"
      statCount={4}
      actions={null}
    />
  );
}
