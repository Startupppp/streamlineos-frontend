import { requirePermission } from "@/lib/rbac/require-permission";
import { SlaReportPage } from "@/features/recruitment/sla-report/sla-report-page";

export default async function RecruitmentSlaReportRoute() {
  await requirePermission("hr:interviews:view");
  return <SlaReportPage />;
}
