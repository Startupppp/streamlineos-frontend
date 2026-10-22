import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function expensePageDataQueryOptions(
  params: Record<string, unknown> = {},
  selfService = false,
) {
  return {
    queryKey: [
      ...humanResourcesQueryKeys.hr.expenses(),
      "pageData",
      selfService ? "self" : "org",
      params,
    ] as const,
    staleTime: 30_000,
  };
}
