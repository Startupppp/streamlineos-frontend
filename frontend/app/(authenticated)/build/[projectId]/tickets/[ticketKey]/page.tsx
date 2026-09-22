import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { TicketDetailPage } from "@/features/build/ticket-details/ticket-detail-page";

interface PageProps {
  params: Promise<{ projectId: string; ticketKey: string }>;
}

export default async function ProjectTicketDetailRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/tickets/[ticketKey]");
  const { projectId, ticketKey } = await params;
  const parsedProjectId = parseInt(projectId, 10);
  if (!Number.isFinite(parsedProjectId) || parsedProjectId <= 0) {
    return null;
  }
  return (
    <TicketDetailPage
      projectId={parsedProjectId}
      ticketKey={decodeURIComponent(ticketKey)}
    />
  );
}
