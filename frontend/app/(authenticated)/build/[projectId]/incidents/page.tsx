import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { IncidentsPage } from "@/features/build/incidents/incidents-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function IncidentsRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/incidents");
  const { projectId: projectIdStr } = await params;
  return <IncidentsPage projectId={parseInt(projectIdStr, 10)} />;
}
