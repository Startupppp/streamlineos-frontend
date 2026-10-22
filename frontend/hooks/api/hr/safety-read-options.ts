import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import type { ListIncidentsParams } from "@/hooks/api/hr/safety";

export function safetyIncidentsQueryOptions(params: ListIncidentsParams = {}) {
  return {
    queryKey: directoryAndOwnershipQueryKeys.hrSafety.incidents(params),
    staleTime: 30_000,
  } as const;
}
