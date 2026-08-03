import { requirePermission } from "@/lib/rbac/require-permission";
import { ModuleAccessPage } from "@/features/module-access/module-access-page";

export default async function SurveysAccessRoute() {
  await requirePermission("surveys:access:view");
  return <ModuleAccessPage moduleKey="surveys" title="Surveys Access" />;
}
