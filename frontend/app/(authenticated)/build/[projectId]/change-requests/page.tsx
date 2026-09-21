import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ChangeRequestsPage } from "@/features/build/change-requests/change-requests-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ChangeRequestsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/change-requests");
  const { projectId: projectIdStr } = await params;
  return <ChangeRequestsPage projectId={parseInt(projectIdStr, 10)} />;
}
