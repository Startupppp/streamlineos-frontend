import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function documentTemplatesQueryOptions(params?: { type?: string }) {
  return {
    queryKey: humanResourcesQueryKeys.hr.documentTemplates(params),
    staleTime: 2 * 60_000,
  } as const;
}

export function documentTemplateDetailQueryOptions(templateId: number) {
  return {
    queryKey: humanResourcesQueryKeys.hr.documentTemplate(templateId),
    staleTime: 2 * 60_000,
  } as const;
}
