import { requirePermission } from "@/lib/rbac/require-permission";
import { SlaConfigPage } from "@/features/hr/recruitment/sla/sla-config-page";

export default async function RecruitmentSlaRoute() {
  await requirePermission("hr:interviews:view");
  return <SlaConfigPage />;
}
