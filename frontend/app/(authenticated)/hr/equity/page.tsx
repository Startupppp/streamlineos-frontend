import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrEquityGrants } from "@/lib/prefetch/hr-talent";
import { EquityPage } from "@/features/hr/enterprise/comp/equity-page";
import HrEquityLoading from "./loading";

async function EquityHydrated() {
  await requirePermission("hr:equity:view");
  const state = await prefetchHrEquityGrants();
  return (
    <HydrationBoundary state={state}>
      <EquityPage />
    </HydrationBoundary>
  );
}

export default function HrEquityPage() {
  return (
    <Suspense fallback={<HrEquityLoading />}>
      <EquityHydrated />
    </Suspense>
  );
}
