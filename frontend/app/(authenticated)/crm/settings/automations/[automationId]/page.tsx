import { requirePermission } from "@/lib/rbac/require-permission";
import { AutomationBuilder } from "@/features/crm/settings/automations/builder/automation-builder";

export default async function AutomationBuilderPage({
  params,
}: {
  params: Promise<{ automationId: string }>;
}) {
  await requirePermission("crm:automations:manage");
  const { automationId } = await params;
  return <AutomationBuilder automationId={automationId} />;
}
