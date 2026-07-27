import { requirePermission } from "@/lib/rbac/require-permission";
import { ModuleAccessPage } from "@/features/module-access/module-access-page";

export default async function ProjectsAccessRoute() {
  await requirePermission("build:access:view");
  return <ModuleAccessPage moduleKey="projects" title="Projects Access" />;
}
