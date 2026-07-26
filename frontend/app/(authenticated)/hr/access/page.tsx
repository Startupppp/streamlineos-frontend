import { requirePermission } from "@/lib/rbac/require-permission";
import { ModuleAccessPage } from "@/features/module-access/module-access-page";

export default async function HrAccessRoute() {
  await requirePermission("hr:access:view");
  return <ModuleAccessPage moduleKey="hr" title="HR Access" />;
}
