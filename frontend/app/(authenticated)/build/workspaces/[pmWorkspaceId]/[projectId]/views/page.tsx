import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ViewsPage } from "@/features/build/views/views-page";

interface PageProps {
  params: Promise<{ pmWorkspaceId: string; projectId: string }>;
}

export default async function ViewsWorkspaceRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/workspaces/[pmWorkspaceId]/[projectId]/views");
  return <ViewsPage params={params} />;
}
