import { requirePermission } from "@/lib/rbac/require-permission";
import { ModuleAccessPage } from "@/features/module-access/module-access-page";

export default async function DirectoryAccessRoute() {
  await requirePermission("directory:access:view");
  return <ModuleAccessPage moduleKey="directory" title="Directory Access" />;
}
