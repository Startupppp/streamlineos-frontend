import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { hrFormsListKey } from "@/features/hr/forms/hooks/hr-forms-schema";

export function hrFormsListQueryOptions(params?: { status?: string; audience?: string; cursor?: string; limit?: number }) {
  return {
    queryKey: hrFormsListKey(params),
    staleTime: 30_000,
  } as const;
}

export function hrFormDetailQueryOptions(formId: number | undefined) {
  return {
    queryKey: [...humanResourcesQueryKeys.hr.hrFormsAll, formId] as const,
    staleTime: 30_000,
  } as const;
}
