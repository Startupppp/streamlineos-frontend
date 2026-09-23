import { requirePermission } from "@/lib/rbac/require-permission";
import { RecruitmentReportsPage } from "@/features/hr/recruitment/reports-page";

export default async function RecruitmentReportsRoute() {
  await requirePermission("hr:interviews:view");
  return <RecruitmentReportsPage />;
}
