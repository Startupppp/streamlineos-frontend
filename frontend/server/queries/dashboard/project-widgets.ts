"server-only";

import { serverApiClient } from "@/lib/api/server-client";
import type { RecentProject, SprintSummary } from "@/types/dashboard";

export async function getRecentProjects(): Promise<RecentProject[]> {
  return serverApiClient.get<RecentProject[]>("/dashboard/recent-projects");
}

export async function getActiveSprintSummary(): Promise<SprintSummary | null> {
  return serverApiClient.get<SprintSummary | null>("/dashboard/active-sprint");
}
