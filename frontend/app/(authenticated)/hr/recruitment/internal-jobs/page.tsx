import { requirePermission } from "@/lib/rbac/require-permission";
import { InternalJobsClient } from "@/features/hr/recruitment/components/internal-jobs-client";

export default async function RecruitmentInternalJobsRoute() {
  await requirePermission("hr:requisitions:view");
  return <InternalJobsClient />;
}
