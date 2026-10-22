import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrAnalyticsOverview } from "@/lib/prefetch/hr-talent";
import { AnalyticsPageClient } from "@/features/hr/analytics/analytics-page-client";
import HrAnalyticsLoading from "./loading";

async function AnalyticsHydrated() {
  await requirePermission("hr:analytics:read");
  const state = await prefetchHrAnalyticsOverview();
  return (
    <HydrationBoundary state={state}>
      <AnalyticsPageClient />
    </HydrationBoundary>
  );
}

export default function HrAnalyticsPage() {
  return (
    <Suspense fallback={<HrAnalyticsLoading />}>
      <AnalyticsHydrated />
    </Suspense>
  );
}
