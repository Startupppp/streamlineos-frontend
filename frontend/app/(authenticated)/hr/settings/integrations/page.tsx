import { requirePermission } from "@/lib/rbac/require-permission";
import { HrIntegrationsSettings } from "@/features/hr/settings/hr-integrations/hr-integrations-settings";

export default async function HrIntegrationsPage() {
  await requirePermission("hr:integrations:manage");
  return <HrIntegrationsSettings />;
}
