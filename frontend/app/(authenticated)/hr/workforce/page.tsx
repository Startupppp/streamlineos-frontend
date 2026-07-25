import { requirePermission } from "@/lib/rbac/require-permission";
import { WorkforcePlanningPage } from "@/features/hr/workforce";

export default async function HrWorkforcePage() {
  await requirePermission("hr:analytics:read");
  return <WorkforcePlanningPage />;
}
