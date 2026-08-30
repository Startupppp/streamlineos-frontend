import { requirePermission } from "@/lib/rbac/require-permission";
import { AutomationBuilder } from "@/features/crm/settings/automations/builder/automation-builder";

export default async function NewAutomationPage() {
  await requirePermission("crm:automations:manage");
  return <AutomationBuilder automationId="new" />;
}
