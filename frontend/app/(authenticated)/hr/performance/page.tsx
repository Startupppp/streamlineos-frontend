import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrReviewCycles } from "@/lib/prefetch/hr-talent";
import { PerformancePageClient } from "@/features/hr/performance/performance-page-client";
import PerformanceLoading from "./loading";

async function PerformanceHydrated() {
  await requirePermission("hr:performance:manage");
  const state = await prefetchHrReviewCycles();
  return (
    <HydrationBoundary state={state}>
      <PerformancePageClient />
    </HydrationBoundary>
  );
}

export default function PerformancePage() {
  return (
    <Suspense fallback={<PerformanceLoading />}>
      <PerformanceHydrated />
    </Suspense>
  );
}
