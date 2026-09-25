import { requirePermission } from "@/lib/rbac/require-permission";
import { DiversityReportPage } from "@/features/recruitment/diversity-report-page";

export default async function RecruitmentDiversityReportRoute() {
  await requirePermission("hr:sensitive:view");
  return <DiversityReportPage />;
}
