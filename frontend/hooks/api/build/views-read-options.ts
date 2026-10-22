import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export function viewsListQueryOptions(projectId: number, params?: Record<string, string>) {
  return {
    queryKey: [...buildWorkQueryKeys.projects.views(projectId), params ?? {}],
    staleTime: 60_000,
  };
}
