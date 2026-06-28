"server-only";

import { serverApiClient } from "@/lib/api/server-client";
import type { RecentProject, SprintSummary } from "@/types/dashboard";

export async function getRecentProjects(orgId: string, userId: string, role?: string | null): Promise<RecentProject[]> {
  return serverApiClient.get<RecentProject[]>("/dashboard/recent-projects");
}

export async function getActiveSprintSummary(orgId: string, userId: string, role?: string | null): Promise<SprintSummary | null> {
  return serverApiClient.get<SprintSummary | null>("/dashboard/active-sprint");
}
