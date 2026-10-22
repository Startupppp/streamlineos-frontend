import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type { ProbationListParams } from "./probation";

export function probationListQueryOptions(params: ProbationListParams = {}) {
  return {
    queryKey: humanResourcesQueryKeys.hr.probationList(params),
    staleTime: 60_000,
  } as const;
}
