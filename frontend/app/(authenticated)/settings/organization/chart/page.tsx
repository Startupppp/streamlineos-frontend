import { requirePermission } from "@/lib/rbac/require-permission";
import { OrganizationChartPage } from "@/features/settings/organization/hierarchy/organization-chart-page";

export default async function OrganizationChartRoute() {
  await requirePermission("settings:view");
  return <OrganizationChartPage />;
}
