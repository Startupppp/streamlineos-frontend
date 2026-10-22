import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export function intakeRequestsQueryOptions(projectId: number, params?: Record<string, string>) {
  return {
    queryKey: buildWorkQueryKeys.projects.intake(
      projectId,
      params && Object.keys(params).length > 0 ? params : undefined,
    ),
    staleTime: 30_000,
  };
}
