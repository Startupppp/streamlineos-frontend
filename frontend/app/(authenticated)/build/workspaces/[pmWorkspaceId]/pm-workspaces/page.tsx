import { requirePermission } from "@/lib/rbac/require-permission";
import { PmWorkspacesPage } from "@/features/build/pm-workspaces/pm-workspaces-page";

export default async function PmWorkspacesRoute() {
  await requirePermission("build:workspaces:view");
  return <PmWorkspacesPage />;
}
