import { requirePermission } from "@/lib/rbac/require-permission";
import { PmWorkspacesPage } from "@/features/projects/pm-workspaces/pm-workspaces-page";

export default async function PmWorkspacesRoute() {
  await requirePermission("projects:workspaces:view");
  return <PmWorkspacesPage />;
}
