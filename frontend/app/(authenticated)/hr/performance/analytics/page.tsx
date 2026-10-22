import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrReviewCycles } from "@/lib/prefetch/hr-talent";
import { PerformanceAnalyticsPageClient } from "@/features/hr/analytics/performance-analytics-page-client";
import PerformanceAnalyticsLoading from "./loading";

async function PerformanceAnalyticsHydrated() {
  await requirePermission("hr:performance:view");
  const state = await prefetchHrReviewCycles();
  return (
    <HydrationBoundary state={state}>
      <PerformanceAnalyticsPageClient />
    </HydrationBoundary>
  );
}

export default function PerformanceAnalyticsPage() {
  return (
    <Suspense fallback={<PerformanceAnalyticsLoading />}>
      <PerformanceAnalyticsHydrated />
    </Suspense>
  );
}
