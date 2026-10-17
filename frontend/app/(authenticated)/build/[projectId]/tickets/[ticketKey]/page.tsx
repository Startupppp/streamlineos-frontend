import { notFound } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { TicketDetailPage } from "@/features/build/ticket-details/ticket-detail-page";
import { decodeRouteSegment } from "@/features/build/ticket-details/build-ticket-detail-url";

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
  const decodedTicketKey = decodeRouteSegment(ticketKey);
  if (decodedTicketKey === null) notFound();
  return (
    <TicketDetailPage
      projectId={parsedProjectId}
      ticketKey={decodedTicketKey}
    />
  );
}
