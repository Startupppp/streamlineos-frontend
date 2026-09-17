import { requirePermission } from "@/lib/rbac/require-permission";
import { HiringFlowsPage } from "@/features/hr/recruitment/hiring-flows-page";

export default async function RecruitmentHiringFlowsRoute() {
  await requirePermission("hr:interviews:view");
  return <HiringFlowsPage />;
}
