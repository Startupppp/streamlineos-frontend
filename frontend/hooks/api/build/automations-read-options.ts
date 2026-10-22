import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import type { AutomationActionType } from "@/types/projects/automations";

export interface AutomationsFilters {
  action?: AutomationActionType;
  ownerId?: string;
  search?: string;
}

export function automationsListQueryOptions(projectId: number, filters?: AutomationsFilters) {
  return {
    queryKey: [...buildWorkQueryKeys.projects.automations(projectId), filters ?? {}],
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: { pagination: { nextCursor: string | null } }) =>
      last.pagination.nextCursor ?? undefined,
    staleTime: 60_000,
  };
}
