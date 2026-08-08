import { requirePermission } from "@/lib/rbac/require-permission";
import { OrganizationSettingsPage } from "@/features/settings/organization/organization-settings-page";

export default async function OrganizationSettingsRoute() {
  await requirePermission("settings:view");
  return <OrganizationSettingsPage />;
}
