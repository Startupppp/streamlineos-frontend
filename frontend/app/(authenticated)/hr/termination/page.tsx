import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrTerminationList } from "@/lib/prefetch/hr-people";
import { TerminationPage } from "@/features/hr/termination/termination-page";
import TerminationLoading from "./loading";

async function TerminationHydrated() {
  const state = await prefetchHrTerminationList();
  return (
    <HydrationBoundary state={state}>
      <TerminationPage />
    </HydrationBoundary>
  );
}

export default async function Page() {
  await requirePermission("hr:exit:manage");
  return (
    <Suspense fallback={<TerminationLoading />}>
      <TerminationHydrated />
    </Suspense>
  );
}
