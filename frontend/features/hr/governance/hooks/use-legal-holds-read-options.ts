import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function legalHoldsListQueryOptions(params?: {
  status?: string;
  subjectUserId?: string;
  cursor?: string;
  limit?: number;
}) {
  return {
    queryKey: [...humanResourcesQueryKeys.hr.hrLegalHoldsBase, params] as const,
    staleTime: 30_000,
  };
}
