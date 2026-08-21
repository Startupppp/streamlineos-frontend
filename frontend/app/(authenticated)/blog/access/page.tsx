import { requirePermission } from "@/lib/rbac/require-permission";
import { ModuleAccessPage } from "@/features/module-access/module-access-page";

export default async function BlogAccessRoute() {
  await requirePermission("blog:access:view");
  return <ModuleAccessPage moduleKey="blog" title="Blog Access" />;
}
