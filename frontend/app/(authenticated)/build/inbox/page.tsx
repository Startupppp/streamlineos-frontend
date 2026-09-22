import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { InboxPage } from "@/features/build/inbox/inbox-page";

export default async function BuildInboxRoute() {
  await enforceRouteAccess("/build/inbox");
  return <InboxPage />;
}
