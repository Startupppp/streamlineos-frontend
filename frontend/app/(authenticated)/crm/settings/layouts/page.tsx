import { requirePermission } from "@/lib/rbac/require-permission";
import { LayoutSettingsPage } from "@/components/renderer/layout-settings/layout-settings-page";

export default async function RecordLayoutsRoute() {
  await requirePermission("crm:settings:view");
  return <LayoutSettingsPage />;
}
