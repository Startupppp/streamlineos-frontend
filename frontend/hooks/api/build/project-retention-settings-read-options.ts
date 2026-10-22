import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export function retentionSettingsQueryOptions(projectId: number) {
  return {
    queryKey: buildWorkQueryKeys.projects.retentionSettings(projectId),
    staleTime: 60_000,
  } as const;
}
