import { requirePermission } from "@/lib/rbac/require-permission";
import { ModuleAccessPage } from "@/features/module-access/module-access-page";

export default async function SignAccessRoute() {
  await requirePermission("sign:access:view");
  return <ModuleAccessPage moduleKey="sign" title="SignOS Access" />;
}
