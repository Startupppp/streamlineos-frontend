import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getAuthenticatedMember } from "@/lib/auth-helpers";
import {
  getDashboardStats,
  getRecentProjects,
  getActiveSprintSummary,
  getRoleStats,
} from "@/server/queries/dashboard";
import { getServerQueryClient } from "@/lib/api/server-query-client";
import { queryKeys } from "@/lib/query-keys";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const auth = await getAuthenticatedMember();
  if ("error" in auth) {
    return <DashboardClient />;
  }

  const qc = getServerQueryClient();

  await Promise.all([
    qc.prefetchQuery({
      queryKey: queryKeys.dashboard.stats(),
      queryFn: getDashboardStats,
    }),
    qc.prefetchQuery({
      queryKey: queryKeys.dashboard.recentProjects(),
      queryFn: getRecentProjects,
    }),
    qc.prefetchQuery({
      queryKey: queryKeys.dashboard.activeSprintSummary(),
      queryFn: getActiveSprintSummary,
    }),
    qc.prefetchQuery({
      queryKey: [...queryKeys.dashboard.all, "roleStats"] as const,
      queryFn: getRoleStats,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
