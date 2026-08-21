import { requirePermission } from "@/lib/rbac/require-permission";
import { ModuleAccessPage } from "@/features/module-access/module-access-page";

export default async function WorkflowsAccessRoute() {
  await requirePermission("workflows:access:view");
  return <ModuleAccessPage moduleKey="workflows" title="Workflows Access" />;
}
