import { InventoryDetailPageLoading } from "@/features/inventory/components/inventory-detail-page-loading";

export default function LotDetailLoading() {
  return (
    <InventoryDetailPageLoading
      title="Lot"
      backHref="/inventory/lots"
      statCols={3}
      statCount={3}
    />
  );
}
