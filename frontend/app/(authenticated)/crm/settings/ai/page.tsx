import { requirePermission } from "@/lib/rbac/require-permission";
import { CrmAiSettings } from "@/features/crm/settings/ai-settings";

export default async function CrmAiSettingsPage() {
  await requirePermission("crm:settings:manage");
  return <CrmAiSettings />;
}
