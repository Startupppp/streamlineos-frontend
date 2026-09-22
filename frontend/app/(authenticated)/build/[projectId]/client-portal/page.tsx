import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ClientVisibilityPage } from "@/features/build/client-portal/client-visibility-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ClientPortalRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/client-portal");
  const { projectId: projectIdStr } = await params;
  return <ClientVisibilityPage projectId={parseInt(projectIdStr, 10)} />;
}
