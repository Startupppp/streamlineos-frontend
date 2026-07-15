import { InventoryDetailPageLoading } from "@/features/inventory/components/inventory-detail-page-loading";

export default function PhysicalAuditDetailLoading() {
  return (
    <InventoryDetailPageLoading
      title="Physical Audit"
      backHref="/inventory/physical-audits"
      actions={null}
    />
  );
}
