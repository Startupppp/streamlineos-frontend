"use client";

import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type { IdentityView } from "@/hooks/api/hr/recruitment/identity-schema";

export type { IdentityView };

const identityContract = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/identity-schema").then((m) => m.identityViewContract),
);

/**
 * A candidate's identity-verification state.
 *
 * Read-only from this screen on purpose. `POST .../identity/verify` takes a
 * vendor token produced by the *candidate's* own session, so there is nothing
 * a recruiter could type here that would mean anything — and a field that
 * looked typeable would invite somebody to record a verification that never
 * happened, which is the exact claim this whole family refuses to fabricate.
 */
export function useCandidateIdentity(candidateId: number) {
  return useGatedQuery("hr:requisitions:view", {
    queryKey: humanResourcesQueryKeys.hr.candidateIdentity(candidateId),
    queryFn: ({ signal }) =>
      apiClient.get<IdentityView>(
        `/hr/recruitment/candidates/${candidateId}/identity`,
        undefined,
        signal,
        identityContract,
      ),
    staleTime: 60_000,
  });
}
