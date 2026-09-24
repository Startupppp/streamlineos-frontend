"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import type { BgvCheckType, BgvView } from "@/hooks/api/hr/recruitment/bgv-schema";

export type { BgvView, BgvCheckType };

const bgvViewC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/bgv-schema").then((m) => m.bgvViewContract),
);

const bgvKey = (candidateId: number) =>
  ["hr", "recruitment", "candidates", candidateId, "bgv"] as const;

export function useCandidateBgv(candidateId: number) {
  return useGatedQuery("hr:requisitions:view", {
    queryKey: bgvKey(candidateId),
    queryFn: ({ signal }) =>
      apiClient.get<BgvView>(
        `/hr/recruitment/candidates/${candidateId}/bgv`,
        undefined,
        signal,
        bgvViewC,
      ),
    staleTime: 60_000,
  });
}

/**
 * Opens a case with the connected agency.
 *
 * Idempotency is the server's, keyed on the route: opening a case costs money
 * and a double-submit would buy the same check twice.
 */
export function useInitiateBgv(candidateId: number) {
  const qc = useQueryClient();
  return useAuthorizedMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "candidates", candidateId, "bgv", "initiate"],
    mutationFn: (checks: BgvCheckType[]) =>
      apiClient.post<BgvView>(
        `/hr/recruitment/candidates/${candidateId}/bgv/initiate`,
        { checks },
        undefined,
        bgvViewC,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: bgvKey(candidateId) }),
  });
}
