import { requirePermission } from "@/lib/rbac/require-permission";
import { RecruitersPage } from "@/features/hr/recruitment/recruiters-page";

export default async function RecruitmentRecruitersRoute() {
  await requirePermission("hr:employees:view");
  return <RecruitersPage />;
}
