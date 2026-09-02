import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { IntakePage } from "@/features/build/intake/intake-page";

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  await enforceRouteAccess("/build/[projectId]/intake");
  const { projectId } = await params;
  return <IntakePage projectId={Number(projectId)} />;
}
