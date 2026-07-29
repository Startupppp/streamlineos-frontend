import { requirePermission } from "@/lib/rbac/require-permission";
import { ModuleAccessPage } from "@/features/module-access/module-access-page";

export default async function AccountingAccessRoute() {
  await requirePermission("accounting:access:view");
  return <ModuleAccessPage moduleKey="accounting" title="Accounting Access" />;
}
