import { hrCustomFieldsListKey } from "@/features/hr/custom-fields/hooks/hr-custom-fields-schema";

export function hrCustomFieldsQueryOptions(entityType: string = "employee") {
  return {
    queryKey: hrCustomFieldsListKey(entityType),
    staleTime: 60_000,
  } as const;
}
