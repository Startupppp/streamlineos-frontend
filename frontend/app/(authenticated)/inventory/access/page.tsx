import { requirePermission } from "@/lib/rbac/require-permission";
import { ModuleAccessPage } from "@/features/module-access/module-access-page";

export default async function InventoryAccessRoute() {
  await requirePermission("inventory:access:view");
  return <ModuleAccessPage moduleKey="inventory" title="Inventory Access" />;
}
