import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrBenefitPlans } from "@/lib/prefetch/hr-talent";
import { BenefitsPageClient } from "@/features/hr/benefits/benefits-page-client";
import BenefitsLoading from "./loading";

async function BenefitsHydrated() {
  await requirePermission("hr:benefits:view");
  const state = await prefetchHrBenefitPlans();
  return (
    <HydrationBoundary state={state}>
      <BenefitsPageClient />
    </HydrationBoundary>
  );
}

export default function BenefitsPage() {
  return (
    <Suspense fallback={<BenefitsLoading />}>
      <BenefitsHydrated />
    </Suspense>
  );
}
