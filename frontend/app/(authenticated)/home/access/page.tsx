import { requirePermission } from "@/lib/rbac/require-permission";
import { ModuleAccessPage } from "@/features/module-access/module-access-page";

export default async function HomeAccessRoute() {
  await requirePermission("home:access:view");
  return <ModuleAccessPage moduleKey="home" title="Home Access" />;
}
