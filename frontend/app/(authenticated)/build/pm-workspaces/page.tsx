import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { PmWorkspacesPage } from "@/features/build/pm-workspaces/pm-workspaces-page";

export default async function PmWorkspacesRoute() {
  await enforceRouteAccess("/build/pm-workspaces");
  return <PmWorkspacesPage />;
}
