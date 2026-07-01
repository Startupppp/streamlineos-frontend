import { requirePermission } from "@/lib/rbac/require-permission";
import { LeaveAnalyticsClient } from "@/features/hr/leaves/components/leave-analytics-client";

export default async function LeaveAnalyticsPage() {
  await requirePermission("hr:leaves:view");
  return <LeaveAnalyticsClient />;
}
