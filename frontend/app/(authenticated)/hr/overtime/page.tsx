import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { OvertimePage } from "@/features/hr/overtime/overtime-page";
import { prefetchOvertimeRequests } from "@/lib/prefetch/hr-time";
import OvertimeLoading from "./loading";

async function OvertimeHydrated() {
  const state = await prefetchOvertimeRequests();
  return (
    <HydrationBoundary state={state}>
      <OvertimePage />
    </HydrationBoundary>
  );
}

export default async function Page() {
  await requirePermission("hr:attendance:view");
  return (
    <Suspense fallback={<OvertimeLoading />}>
      <OvertimeHydrated />
    </Suspense>
  );
}
