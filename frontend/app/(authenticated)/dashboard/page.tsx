import { HydrationBoundary } from "@tanstack/react-query";
import { DashboardClient } from "@/features/dashboard/dashboard-client";
import { prefetchDashboardStats } from "@/lib/prefetch/dashboard";

export default async function DashboardPage() {
  const state = await prefetchDashboardStats();
  return (
    <HydrationBoundary state={state}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
