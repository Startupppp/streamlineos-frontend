import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import type { SimulationType } from "./enterprise-ops-simulator";

export function simulationHistoryQueryOptions(params: { cursor?: string; type?: SimulationType } = {}) {
  return {
    queryKey: directoryAndOwnershipQueryKeys.hrSimulations.history(params),
    staleTime: 30_000,
  } as const;
}
