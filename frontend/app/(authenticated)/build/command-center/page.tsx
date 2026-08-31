import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { CommandCenterPage } from "@/features/build/command-center/command-center-page";

export default async function CommandCenterRoute() {
  await enforceRouteAccess("/build/command-center");
  return <CommandCenterPage />;
}
