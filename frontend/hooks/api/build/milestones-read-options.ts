import { queryKeyBase } from "@/lib/query-keys/base";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export interface MilestoneListQuery {
  cursor?: string;
  limit?: number;
  status?: "PENDING" | "ACHIEVED" | "MISSED";
  q?: string;
  from?: string;
  to?: string;
  ownerId?: number;
}

export function milestoneBaseKey(projectId: number) {
  return [...queryKeyBase, "projects", projectId, "milestones"] as const;
}

function milestoneKey(projectId: number, query?: MilestoneListQuery) {
  return [...milestoneBaseKey(projectId), query ?? {}] as const;
}

export function milestonesQueryOptions(projectId: number, query?: MilestoneListQuery) {
  const q = query ?? {};
  return {
    queryKey: milestoneKey(projectId, q),
    staleTime: 30_000,
  };
}

export function projectBudgetQueryOptions(projectId: number) {
  return {
    queryKey: buildWorkQueryKeys.projects.budget(projectId),
    staleTime: 60_000,
  };
}
