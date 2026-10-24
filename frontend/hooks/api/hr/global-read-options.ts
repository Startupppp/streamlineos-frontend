import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type { ComplianceRequirementsParams, ContractsParams } from "./global";

export const complianceRequirementsQueryOptions = (params?: ComplianceRequirementsParams) => ({
  queryKey: humanResourcesQueryKeys.hr.complianceRequirements(params),
  staleTime: 120_000,
} as const);

export const contractsQueryOptions = (params?: ContractsParams) => ({
  queryKey: humanResourcesQueryKeys.hr.contracts(params),
  staleTime: 60_000,
} as const);
