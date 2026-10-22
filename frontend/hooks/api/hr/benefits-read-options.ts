import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type { BenefitPlansQuery } from "@/hooks/api/hr/benefits";

export const benefitPlansQueryOptions = (query: BenefitPlansQuery = {}) => ({
  queryKey: humanResourcesQueryKeys.hr.benefitPlans(query),
  staleTime: 2 * 60_000,
});
