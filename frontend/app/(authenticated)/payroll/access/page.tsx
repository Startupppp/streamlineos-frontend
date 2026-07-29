import { requirePermission } from "@/lib/rbac/require-permission";
import { ModuleAccessPage } from "@/features/module-access/module-access-page";

export default async function PayrollAccessRoute() {
  await requirePermission("payroll:access:view");
  return <ModuleAccessPage moduleKey="payroll" title="Payroll Access" />;
}
