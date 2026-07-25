import { requirePermission } from "@/lib/rbac/require-permission";
import { AnalyticsPageClient } from "@/features/hr/analytics/analytics-page-client";

export default async function HrAnalyticsPage() {
  await requirePermission("hr:analytics:read");
  return <AnalyticsPageClient />;
}
