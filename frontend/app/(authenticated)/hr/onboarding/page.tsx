import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrOnboarding } from "@/lib/prefetch/hr-people";
import { OnboardingListPage } from "@/features/hr/onboarding/onboarding-list-page";
import OnboardingLoading from "./loading";

async function OnboardingHydrated() {
  const state = await prefetchHrOnboarding();
  return (
    <HydrationBoundary state={state}>
      <OnboardingListPage />
    </HydrationBoundary>
  );
}

export default async function Page() {
  await requirePermission("hr:onboarding:manage");
  return (
    <Suspense fallback={<OnboardingLoading />}>
      <OnboardingHydrated />
    </Suspense>
  );
}
