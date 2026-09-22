import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { IncidentDetailPage } from "@/features/build/incidents/incident-detail-page";

interface PageProps {
  params: Promise<{ projectId: string; incidentId: string }>;
}

export default async function IncidentDetailRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/incidents/[incidentId]");
  const { projectId, incidentId } = await params;
  return (
    <IncidentDetailPage
      projectId={parseInt(projectId, 10)}
      incidentId={parseInt(incidentId, 10)}
    />
  );
}
