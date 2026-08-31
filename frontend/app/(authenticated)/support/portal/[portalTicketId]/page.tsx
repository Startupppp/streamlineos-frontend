import { notFound } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { PortalTicketDetailPage } from "@/features/support/portal/portal-ticket-detail-page";

interface PageProps {
  params: Promise<{ portalTicketId: string }>;
}

export default async function SupportPortalTicketRoute({ params }: PageProps) {
  await enforceRouteAccess("/support/portal/[portalTicketId]");
  const { portalTicketId } = await params;
  const id = parseInt(portalTicketId, 10);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <PortalTicketDetailPage portalTicketId={id} />;
}
