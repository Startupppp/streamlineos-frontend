import { requirePermission } from "@/lib/rbac/require-permission";
import { ModuleAccessPage } from "@/features/module-access/module-access-page";

export default async function TimesheetsAccessRoute() {
  await requirePermission("timesheets:access:view");
  return <ModuleAccessPage moduleKey="timesheets" title="Timesheets Access" />;
}
