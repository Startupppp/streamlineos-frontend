import { requirePermission } from "@/lib/rbac/require-permission";
import { BusinessUnitsPage } from "@/features/settings/organization/hierarchy/business-units-page";

export default async function BusinessUnitsRoute() {
  await requirePermission("settings:view");
  return <BusinessUnitsPage />;
}
