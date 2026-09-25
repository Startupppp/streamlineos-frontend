import { requirePermission } from "@/lib/rbac/require-permission";
import { RecruitersPage } from "@/features/recruitment/recruiters-page";

export default async function RecruitmentRecruitersRoute() {
  await requirePermission("hr:requisitions:view");
  return <RecruitersPage />;
}
