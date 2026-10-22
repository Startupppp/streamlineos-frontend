import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type { HrPolicyType, HrPolicyStatus } from "@/types/hr/policies";

export const hrPoliciesQueryOptions = (params?: {
  cursor?: string;
  limit?: number;
  type?: HrPolicyType;
  status?: HrPolicyStatus;
  search?: string;
}) => ({
  queryKey: humanResourcesQueryKeys.hr.hrPoliciesList(params),
  staleTime: 60_000,
});
