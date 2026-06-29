import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getAuthenticatedMember } from "@/lib/auth-helpers";
import { getServerQueryClient } from "@/lib/api/server-query-client";
import { queryKeys } from "@/lib/query-keys";
import { getDashboardStats, getRoleStats } from "@/server/queries/dashboard/hr-widgets";
import {
  getActiveSprintSummary,
  getRecentProjects,
} from "@/server/queries/dashboard/project-widgets";
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
      queryFn: () => getDashboardStats(auth.orgId, auth.userId),
    }),
    qc.prefetchQuery({
      queryKey: queryKeys.dashboard.recentProjects(),
      queryFn: () => getRecentProjects(auth.orgId, auth.userId, auth.role),
    }),
    qc.prefetchQuery({
      queryKey: queryKeys.dashboard.activeSprintSummary(),
      queryFn: () => getActiveSprintSummary(auth.orgId, auth.userId, auth.role),
    }),
    qc.prefetchQuery({
      queryKey: [...queryKeys.dashboard.all, "roleStats"] as const,
      queryFn: () => getRoleStats(auth.orgId),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
