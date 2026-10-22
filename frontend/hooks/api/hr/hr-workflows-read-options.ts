import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type { HrWorkflowObjectType, HrWorkflowStatus } from "@/types/hr/workflows";

export function hrWorkflowDefinitionsQueryOptions(params?: { objectType?: HrWorkflowObjectType; status?: HrWorkflowStatus; cursor?: string; limit?: number }) {
  return {
    queryKey: [...humanResourcesQueryKeys.hr.hrWorkflowsAll, params] as const,
    staleTime: 2 * 60_000,
  } as const;
}
