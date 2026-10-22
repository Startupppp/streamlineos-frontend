import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export function projectCustomFieldsQueryOptions(projectId: number) {
  return {
    queryKey: buildWorkQueryKeys.projects.customFields(projectId),
    staleTime: 60_000,
  } as const;
}
