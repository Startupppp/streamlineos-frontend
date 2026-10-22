import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export function iterationSettingsQueryOptions(projectId: number) {
  return {
    queryKey: buildWorkQueryKeys.projects.iterationSettings(projectId),
    staleTime: 60_000,
  } as const;
}
