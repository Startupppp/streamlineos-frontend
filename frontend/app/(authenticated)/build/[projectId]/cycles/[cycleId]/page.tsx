import { CycleDetailPage } from "@/features/build/cycles/cycle-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string; cycleId: string }>;
}) {
  const { projectId, cycleId } = await params;
  return <CycleDetailPage projectId={projectId} cycleId={cycleId} />;
}
