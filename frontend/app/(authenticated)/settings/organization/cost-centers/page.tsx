import { requirePermission } from "@/lib/rbac/require-permission";
import { OrgCostCentersPage } from "@/features/settings/organization/hierarchy/cost-centers-page";

export default async function CostCentersRoute() {
  await requirePermission("settings:view");
  return <OrgCostCentersPage />;
}
