import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { ShiftsPage } from "@/features/hr/shifts/shifts-page";
import { prefetchShifts } from "@/lib/prefetch/hr-time";
import ShiftsLoading from "./loading";

async function ShiftsHydrated() {
  const state = await prefetchShifts();
  return (
    <HydrationBoundary state={state}>
      <ShiftsPage />
    </HydrationBoundary>
  );
}

export default async function Page() {
  await requirePermission("hr:attendance:manage");
  return (
    <Suspense fallback={<ShiftsLoading />}>
      <ShiftsHydrated />
    </Suspense>
  );
}
