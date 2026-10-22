import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export interface CrFilters {
  status?: string;
  impact?: string;
  requesterId?: string;
  approverId?: string;
  releaseId?: number;
  clientVisible?: boolean;
  q?: string;
  cursor?: string;
  limit?: number;
}

export function changeRequestsListQueryOptions(projectId: number, filters?: CrFilters) {
  return {
    queryKey: buildWorkQueryKeys.projects.changeRequests.list(
      projectId,
      filters && Object.keys(filters).length > 0 ? filters : undefined,
    ),
    staleTime: 60_000,
  };
}
