import { requirePermission } from "@/lib/rbac/require-permission";
import { AutomationsClient } from "@/features/hr/recruitment/components/automations-client";

export default async function RecruitmentAutomationsRoute() {
  await requirePermission("hr:employees:view");
  return <AutomationsClient />;
}
