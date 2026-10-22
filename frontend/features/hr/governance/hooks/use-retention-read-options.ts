import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export const retentionPoliciesQueryOptions = (params?: { recordType?: string; active?: boolean; page?: number; limit?: number }) => ({
  queryKey: [...humanResourcesQueryKeys.hr.hrRetentionPoliciesAll, params],
  staleTime: 60_000,
});
