import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { DashboardClient } from "@/features/dashboard/dashboard-client";
import { prefetchDashboardStats } from "@/lib/prefetch/dashboard";

async function DashboardHydrated() {
  const state = await prefetchDashboardStats();
  return (
    <HydrationBoundary state={state}>
      <DashboardClient />
    </HydrationBoundary>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardHydrated />
    </Suspense>
  );
}
