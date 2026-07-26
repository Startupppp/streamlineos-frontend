import { requirePermission } from "@/lib/rbac/require-permission";
import { ModuleAccessPage } from "@/features/module-access/module-access-page";

export default async function CrmAccessRoute() {
  await requirePermission("crm:access:view");
  return <ModuleAccessPage moduleKey="crm" title="CRM Access" />;
}
