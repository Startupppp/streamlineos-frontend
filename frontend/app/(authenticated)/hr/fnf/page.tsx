import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrFnf } from "@/lib/prefetch/hr-people";
import { FnfPageClient } from "@/features/hr/fnf/fnf-page-client";
import FnfLoading from "./loading";

async function FnfHydrated() {
  const state = await prefetchHrFnf();
  return (
    <HydrationBoundary state={state}>
      <FnfPageClient />
    </HydrationBoundary>
  );
}

export default async function FnfPage() {
  await requirePermission("hr:payroll:approve");
  return (
    <Suspense fallback={<FnfLoading />}>
      <FnfHydrated />
    </Suspense>
  );
}
