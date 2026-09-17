import { requirePermission } from "@/lib/rbac/require-permission";
import { DiversityReportPage } from "@/features/hr/recruitment/diversity-report-page";

export default async function RecruitmentDiversityReportRoute() {
  await requirePermission("hr:employees:view");
  return <DiversityReportPage />;
}
