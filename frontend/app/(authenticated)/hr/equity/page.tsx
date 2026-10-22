import { Suspense } from "react";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { EquityPage } from "@/features/hr/enterprise/comp/equity-page";
import HrEquityLoading from "./loading";

async function EquityHydrated() {
  await requirePermission("hr:equity:view");
  const state = dehydrate(new QueryClient());
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
