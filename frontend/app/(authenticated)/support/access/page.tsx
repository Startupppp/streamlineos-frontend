import { requirePermission } from "@/lib/rbac/require-permission";
import { ModuleAccessPage } from "@/features/module-access/module-access-page";

export default async function SupportAccessRoute() {
  await requirePermission("support:access:view");
  return <ModuleAccessPage moduleKey="support" title="Support Access" />;
}
