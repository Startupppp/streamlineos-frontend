import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export function modulesQueryOptions(projectId: number) {
  return {
    queryKey: buildWorkQueryKeys.projects.modules(projectId),
    staleTime: 60_000,
  };
}
