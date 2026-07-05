import { SerialDetailClient } from "@/features/inventory/components/traceability/serial-detail-client";

export default async function SerialDetailPage({
  params,
}: {
  params: Promise<{ serialId: string }>;
}) {
  const { serialId } = await params;
  return <SerialDetailClient serialId={Number(serialId)} />;
}
