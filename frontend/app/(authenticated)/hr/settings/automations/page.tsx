import { requirePermission } from "@/lib/rbac/require-permission";
import { AutomationsSettingsPage } from "@/features/hr/automations/automations-settings-page";

export default async function Page() {
  await requirePermission("hr:automations:view");
  return <AutomationsSettingsPage />;
}
