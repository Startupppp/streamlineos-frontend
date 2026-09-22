import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { CycleDetailPage } from "@/features/build/cycles/cycle-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string; cycleId: string }>;
}) {
  await enforceRouteAccess("/build/[projectId]/cycles/[cycleId]");
  const { projectId, cycleId } = await params;
  return <CycleDetailPage projectId={projectId} cycleId={cycleId} />;
}
