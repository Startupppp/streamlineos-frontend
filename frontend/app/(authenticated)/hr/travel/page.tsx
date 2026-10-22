import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { TravelPage } from "@/features/hr/travel/travel-page";
import { prefetchHrTravel } from "@/lib/prefetch/hr";
import TravelLoading from "./loading";

export default async function HrTravelPage() {
  await requirePermission("hr:travel:view");
  const state = await prefetchHrTravel();
  return (
    <Suspense fallback={<TravelLoading />}>
      <HydrationBoundary state={state}>
        <TravelPage />
      </HydrationBoundary>
    </Suspense>
  );
}
