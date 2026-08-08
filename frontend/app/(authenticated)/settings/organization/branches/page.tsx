import { requirePermission } from "@/lib/rbac/require-permission";
import { OrgBranchesPage } from "@/features/settings/organization/hierarchy/branches-page";

export default async function BranchesRoute() {
  await requirePermission("settings:view");
  return <OrgBranchesPage />;
}
