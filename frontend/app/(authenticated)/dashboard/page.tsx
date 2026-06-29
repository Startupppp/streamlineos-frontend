import { DashboardClient } from "./dashboard-client";

<<<<<<< Updated upstream
export default function DashboardPage() {
  return <DashboardClient />;
=======
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
>>>>>>> Stashed changes
}
