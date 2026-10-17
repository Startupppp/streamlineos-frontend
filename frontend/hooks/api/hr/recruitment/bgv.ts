"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
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
 * Opening a case costs money and a double-submit would buy the same check twice;
 * the route is @Idempotent, so the key is held per intent, not minted per attempt.
 */
export function useInitiateBgv(candidateId: number) {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation("hr:requisitions:manage", {
    mutationKey: ["hr", "recruitment", "candidates", candidateId, "bgv", "initiate"],
    mutationFn: (checks: BgvCheckType[], idempotencyKey: string) =>
      apiClient.post<BgvView>(
        `/hr/recruitment/candidates/${candidateId}/bgv/initiate`,
        { checks },
        { headers: { "Idempotency-Key": idempotencyKey } },
        bgvViewC,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: bgvKey(candidateId) }),
  });
}
