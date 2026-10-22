import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { RostersPage } from "@/features/hr/rosters/rosters-page";
import { prefetchRosters } from "@/lib/prefetch/hr-time";
import RostersLoading from "./loading";

async function RostersHydrated() {
  const state = await prefetchRosters();
  return (
    <HydrationBoundary state={state}>
      <RostersPage />
    </HydrationBoundary>
  );
}

export default async function Page() {
  await requirePermission("hr:attendance:view");
  return (
    <Suspense fallback={<RostersLoading />}>
      <RostersHydrated />
    </Suspense>
  );
}
