import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function emailTemplatesListQueryOptions() {
  return {
    queryKey: humanResourcesQueryKeys.hr.emailTemplatesList(),
    staleTime: 60_000,
  } as const;
}
