import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { PerformancePageClient } from "@/features/hr/performance/performance-page-client";
import PerformanceLoading from "./loading";

export default async function PerformancePage() {
  await requirePermission("hr:performance:manage");
  return (
    <Suspense fallback={<PerformanceLoading />}>
      <PerformancePageClient />
    </Suspense>
  );
}
