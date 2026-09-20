import { requirePermission } from "@/lib/rbac/require-permission";
import { HrEngagementPage } from "@/features/hr/engagement/engagement-page";

export default async function Page() {
  await requirePermission("hr:engagement:view");
  return <HrEngagementPage />;
}
