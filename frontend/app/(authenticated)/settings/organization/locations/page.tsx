import { requirePermission } from "@/lib/rbac/require-permission";
import { OrgLocationsPage } from "@/features/settings/organization/hierarchy/locations-page";

export default async function LocationsRoute() {
  await requirePermission("settings:view");
  return <OrgLocationsPage />;
}
