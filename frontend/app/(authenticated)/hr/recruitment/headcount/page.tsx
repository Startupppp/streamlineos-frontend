import { requirePermission } from "@/lib/rbac/require-permission";
import { HeadcountPage } from "@/features/hr/recruitment/headcount/headcount-page";

export default async function RecruitmentHeadcountRoute() {
  await requirePermission("hr:employees:view");
  return <HeadcountPage />;
}
