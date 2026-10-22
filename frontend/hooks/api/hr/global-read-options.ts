import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type { ComplianceRequirementsParams, ContractsParams } from "./global";

export function complianceRequirementsQueryOptions(params?: ComplianceRequirementsParams) {
  return {
    queryKey: humanResourcesQueryKeys.hr.complianceRequirements(params),
    staleTime: 120_000,
  } as const;
}

export function contractsQueryOptions(params?: ContractsParams) {
  return {
    queryKey: humanResourcesQueryKeys.hr.contracts(params),
    staleTime: 60_000,
  } as const;
}
