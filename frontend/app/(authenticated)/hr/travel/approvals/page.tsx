import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { TravelApprovalsPage } from "@/features/hr/travel/travel-approvals-page";
import { prefetchHrTravelApprovals } from "@/lib/prefetch/hr";
import TravelApprovalsLoading from "./loading";

export default async function HrTravelApprovalsPage() {
  await requirePermission("hr:travel:manage");
  const state = await prefetchHrTravelApprovals();
  return (
    <Suspense fallback={<TravelApprovalsLoading />}>
      <HydrationBoundary state={state}>
        <TravelApprovalsPage />
      </HydrationBoundary>
    </Suspense>
  );
}
