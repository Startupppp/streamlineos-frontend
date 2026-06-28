"server-only";

import { serverApiClient } from "@/lib/api/server-client";
import type { DashboardStats } from "@/types/dashboard";

export async function getDashboardStats(orgId: string, _userId: string): Promise<DashboardStats> {
  return serverApiClient.get<DashboardStats>("/dashboard/stats");
}

export async function getRoleStats(orgId: string): Promise<Record<string, number>> {
  return serverApiClient.get<Record<string, number>>("/dashboard/role-stats");
}
