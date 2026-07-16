import { InventoryDetailPageLoading } from "@/features/inventory/components/inventory-detail-page-loading";

export default function CycleCountDetailLoading() {
  return (
    <InventoryDetailPageLoading
      title="Cycle Count"
      backHref="/inventory/cycle-counts"
      statCount={4}
    />
  );
}
