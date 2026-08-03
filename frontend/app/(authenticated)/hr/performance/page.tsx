import { requirePermission } from "@/lib/rbac/require-permission";
import { PerformancePageClient } from "@/features/hr/performance/performance-page-client";

export default async function PerformancePage() {
  await requirePermission("hr:performance:manage");
  return <PerformancePageClient />;
}
