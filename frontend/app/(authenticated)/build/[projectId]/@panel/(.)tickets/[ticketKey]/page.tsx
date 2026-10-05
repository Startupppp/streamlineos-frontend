import { notFound } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { TicketPanelInner } from "./ticket-panel-inner";
import { decodeRouteSegment } from "@/features/build/ticket-details/build-ticket-detail-url";

interface PageProps {
  params: Promise<{ projectId: string; ticketKey: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}

export default async function TicketDetailPanePage({
  params,
  searchParams,
}: PageProps) {
  await enforceRouteAccess("/build/[projectId]/tickets/[ticketKey]");
  const { projectId, ticketKey } = await params;
  const { returnTo } = await searchParams;
  const parsedProjectId = parseInt(projectId, 10);
  if (!Number.isFinite(parsedProjectId) || parsedProjectId <= 0) return null;
  const decodedTicketKey = decodeRouteSegment(ticketKey);
  if (decodedTicketKey === null) notFound();
  return (
    <TicketPanelInner
      projectId={parsedProjectId}
      ticketKey={decodedTicketKey}
      returnTo={returnTo ?? null}
    />
  );
}
