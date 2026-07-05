import { LotDetailClient } from "@/features/inventory/components/traceability/lot-detail-client";

export default async function LotDetailPage({
  params,
}: {
  params: Promise<{ lotId: string }>;
}) {
  const { lotId } = await params;
  return <LotDetailClient lotId={Number(lotId)} />;
}
