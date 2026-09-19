import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { WorkspaceOverviewPage } from "@/features/build/overview/workspace-overview-page";

interface PageProps {
  params: Promise<{ pmWorkspaceId: string }>;
}

export default async function PmWorkspaceOverviewRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/workspaces/[pmWorkspaceId]/overview");
  const { pmWorkspaceId } = await params;
  return <WorkspaceOverviewPage pmWorkspaceId={pmWorkspaceId} />;
}
