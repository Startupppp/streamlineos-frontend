import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { TeamsListPage } from "@/features/build/teams/teams-list-page";

export default async function TeamsRoute() {
  await enforceRouteAccess("/build/teams");
  return <TeamsListPage />;
}
