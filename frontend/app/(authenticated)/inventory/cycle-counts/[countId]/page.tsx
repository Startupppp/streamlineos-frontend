import { CycleCountDetailClient } from "@/features/inventory/components/control/cycle-count-detail-client";

interface Props {
  params: Promise<{ countId: string }>;
}

export default async function CycleCountDetailPage({ params }: Props) {
  const { countId } = await params;
  return <CycleCountDetailClient countId={Number(countId)} />;
}
