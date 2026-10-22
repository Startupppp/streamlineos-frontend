import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { AccommodationsPageContent } from "@/features/hr/enterprise/ops/accommodations/accommodations-page-content";
import { prefetchHrAccommodations } from "@/lib/prefetch/hr-ops";
import AccommodationsLoading from "./loading";

export default async function HrAccommodationsPage() {
  await requirePermission("hr:accommodations:view");
  const state = await prefetchHrAccommodations();
  return (
    <Suspense fallback={<AccommodationsLoading />}>
      <HydrationBoundary state={state}>
        <AccommodationsPageContent />
      </HydrationBoundary>
    </Suspense>
  );
}
