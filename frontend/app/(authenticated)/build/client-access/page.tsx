import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ClientAccessPage } from "@/features/portal-access/client-access-page";

export default async function BuildClientAccessRoute() {
  await enforceRouteAccess("/build/client-access");
  return <ClientAccessPage />;
}
