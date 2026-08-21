import { requirePermission } from "@/lib/rbac/require-permission";
import { ModuleAccessPage } from "@/features/module-access/module-access-page";

export default async function CalendarAccessRoute() {
  await requirePermission("calendar:access:view");
  return <ModuleAccessPage moduleKey="calendar" title="Calendar Access" />;
}
