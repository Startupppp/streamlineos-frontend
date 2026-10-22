import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export function portalSettingsQueryOptions(projectId: number) {
  return {
    queryKey: buildWorkQueryKeys.projects.clientPortal.settings(projectId),
    staleTime: 30_000,
  } as const;
}
