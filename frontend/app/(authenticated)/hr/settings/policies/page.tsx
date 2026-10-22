import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { HrPoliciesPage } from "@/features/hr/policies/policies-page";
import { prefetchHrPolicies } from "@/lib/prefetch/hr-time";
import PoliciesSettingsLoading from "./loading";

async function PoliciesHydrated() {
  const state = await prefetchHrPolicies();
  return (
    <HydrationBoundary state={state}>
      <HrPoliciesPage />
    </HydrationBoundary>
  );
}

export default async function Page() {
  await requirePermission("hr:policies:view");
  return (
    <Suspense fallback={<PoliciesSettingsLoading />}>
      <PoliciesHydrated />
    </Suspense>
  );
}
