import { PhysicalAuditDetailClient } from "@/features/inventory/components/control/physical-audit-detail-client";

interface Props {
  params: Promise<{ auditId: string }>;
}

export default async function PhysicalAuditDetailPage({ params }: Props) {
  const { auditId } = await params;
  return <PhysicalAuditDetailClient auditId={Number(auditId)} />;
}
