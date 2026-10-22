import { requirePermission } from "@/lib/rbac/require-permission";
import { WorkforceCostPage } from "@/features/hr/workforce-cost/workforce-cost-page";

export default async function Page() {
  await requirePermission("hr:analytics:read");
  return <WorkforceCostPage />;
}
