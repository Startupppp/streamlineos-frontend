import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export function projectRisksListQueryOptions(projectId: number, params?: Record<string, string>) {
  return {
    queryKey: buildWorkQueryKeys.projects.risks.list(
      projectId,
      params && Object.keys(params).length > 0 ? params : undefined,
    ),
    staleTime: 60_000,
  };
}

export function projectDecisionsListQueryOptions(projectId: number, params?: Record<string, string>) {
  return {
    queryKey: buildWorkQueryKeys.projects.decisions.list(
      projectId,
      params && Object.keys(params).length > 0 ? params : undefined,
    ),
    staleTime: 60_000,
  };
}
