import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type { HrTemplateKind, HrTemplateStatus } from "@/types/hr/templates";

interface ListParams {
  kind?: HrTemplateKind;
  status?: HrTemplateStatus;
  search?: string;
  cursor?: string;
  limit?: number;
}

export function hrTemplatesQueryOptions(params?: ListParams) {
  return {
    queryKey: humanResourcesQueryKeys.hr.hrTemplates(params),
    staleTime: 60_000,
  } as const;
}
