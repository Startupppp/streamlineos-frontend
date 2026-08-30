import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { EpicsPage } from "@/features/build/epics/epics-page";

interface PageProps {
  params: Promise<{ pmWorkspaceId: string; projectId: string }>;
}

export default async function EpicsWorkspaceRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/workspaces/[pmWorkspaceId]/[projectId]/epics");
  return <EpicsPage params={params} />;
}
