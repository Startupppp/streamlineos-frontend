import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { HolidaysPage } from "@/features/hr/holidays/holidays-page";
import { prefetchHrHolidays } from "@/lib/prefetch/hr-time";
import HolidaysLoading from "./loading";

async function HolidaysHydrated() {
  const state = await prefetchHrHolidays();
  return (
    <HydrationBoundary state={state}>
      <HolidaysPage />
    </HydrationBoundary>
  );
}

export default async function Page() {
  await requirePermission("self:attendance");
  return (
    <Suspense fallback={<HolidaysLoading />}>
      <HolidaysHydrated />
    </Suspense>
  );
}
