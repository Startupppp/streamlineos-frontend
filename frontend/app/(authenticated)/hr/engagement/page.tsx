import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrRecognition } from "@/lib/prefetch/hr-talent";
import { HrEngagementPage } from "@/features/hr/engagement/engagement-page";
import HrEngagementLoading from "./loading";

async function EngagementHydrated() {
  await requirePermission("hr:engagement:view");
  const state = await prefetchHrRecognition();
  return (
    <HydrationBoundary state={state}>
      <HrEngagementPage />
    </HydrationBoundary>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<HrEngagementLoading />}>
      <EngagementHydrated />
    </Suspense>
  );
}
