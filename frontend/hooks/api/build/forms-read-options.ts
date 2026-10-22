import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";

export function formsListQueryOptions(projectId: number, params?: Record<string, string>) {
  return {
    queryKey: buildWorkQueryKeys.projects.forms.list(
      projectId,
      params && Object.keys(params).length > 0 ? params : undefined,
    ),
    staleTime: 60_000,
  };
}

export function formDetailQueryOptions(projectId: number, formId: number) {
  return {
    queryKey: buildWorkQueryKeys.projects.forms.detail(projectId, formId),
    staleTime: 60_000,
  } as const;
}
