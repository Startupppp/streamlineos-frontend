import { requirePermission } from "@/lib/rbac/require-permission";
import { JobsPage } from "@/features/hr/recruitment/jobs-page";

export default async function Page() {
  await requirePermission("hr:employees:view");
  return <JobsPage />;
}
