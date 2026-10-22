import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { CompOffPageClient } from "@/features/hr/overtime/comp-off-page-client";
import { prefetchCompOff } from "@/lib/prefetch/hr-time";
import CompOffLoading from "./loading";

async function CompOffHydrated() {
  const state = await prefetchCompOff();
  return (
    <HydrationBoundary state={state}>
      <CompOffPageClient />
    </HydrationBoundary>
  );
}

export default async function CompOffPage() {
  await requirePermission("hr:leaves:view");
  return (
    <Suspense fallback={<CompOffLoading />}>
      <CompOffHydrated />
    </Suspense>
  );
}
