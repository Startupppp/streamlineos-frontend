"server-only";

import { serverApiClient } from "@/lib/api/server-client";
import type { DashboardStats } from "@/types/dashboard";

export async function getDashboardStats(): Promise<DashboardStats> {
  return serverApiClient.get<DashboardStats>("/dashboard/stats");
}

export async function getRoleStats(): Promise<Record<string, number>> {
  return serverApiClient.get<Record<string, number>>("/dashboard/role-stats");
}
