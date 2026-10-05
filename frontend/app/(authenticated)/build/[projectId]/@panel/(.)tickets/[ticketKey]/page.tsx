import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { TicketPanelInner } from "./ticket-panel-inner";

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
  return (
    <TicketPanelInner
      projectId={parsedProjectId}
      ticketKey={decodeURIComponent(ticketKey)}
      returnTo={returnTo ?? null}
    />
  );
}
