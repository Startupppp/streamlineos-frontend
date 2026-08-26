import { requirePermission } from "@/lib/rbac/require-permission";
import { LayoutSettingsPage } from "@/features/renderer/layout-settings/layout-settings-page";

export default async function RecordLayoutsRoute() {
  await requirePermission("settings:manage");
  return <LayoutSettingsPage />;
}
