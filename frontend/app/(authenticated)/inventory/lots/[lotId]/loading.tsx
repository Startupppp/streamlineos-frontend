import { InventoryDetailPageLoading } from "@/features/inventory/components/inventory-detail-page-loading";

export default function LotDetailLoading() {
  return (
    <InventoryDetailPageLoading
      title="Loading…"
      backHref="/inventory/lots"
      statCols={3}
      statCount={3}
      actions={null}
    />
  );
}
