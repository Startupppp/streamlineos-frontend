import { requirePermission } from "@/lib/rbac/require-permission";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { ModuleAccessPage } from "@/features/module-access/module-access-page";

export default async function BuildAccessRoute() {
  await enforceRouteAccess("/build/access");
  await requirePermission("build:access:view");
  return <ModuleAccessPage moduleKey="build" title="Build Access" />;
}
