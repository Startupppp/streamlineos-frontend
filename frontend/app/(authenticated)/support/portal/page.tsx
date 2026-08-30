import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { PortalTicketListPage } from "@/features/support/portal/portal-ticket-list-page";

export default async function SupportPortalRoute() {
  await enforceRouteAccess("/support/portal");
  return <PortalTicketListPage />;
}
