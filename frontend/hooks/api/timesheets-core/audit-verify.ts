"use client";

import { apiClient } from "@/lib/api-client";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type { AuditChainVerification } from "@/features/timesheets/types";

/**
 * Ask whether the audit chain is intact. On demand, never on page load.
 *
 * `GET /timesheets/audit/verify` recomputes a SHA hash for every event and
 * compares it to the one stored, so it is a real scan of up to ten thousand
 * rows — not something to fire because somebody opened a tab. It is also the
 * only way to answer "has this record been altered?", and it had no caller at
 * all: the audit list was readable and its integrity was not checkable.
 *
 * `enabled: false` with an explicit `refetch` is how TanStack expresses an
 * on-demand GET. A mutation would be the wrong shape — nothing is written, and
 * the answer is a fact about current state that belongs in the cache.
 */
export function useVerifyAuditChain() {
  const query = useGatedQuery("timesheets:audit:view", {
    queryKey: usersAndCommerceQueryKeys.timesheets.auditVerify(),
    queryFn: () =>
      apiClient.get<AuditChainVerification>("/timesheets/audit/verify"),
    enabled: false,
    /*
     * The chain only grows, so an answer stays true about the rows it covered.
     * `gcTime` keeps it across a tab switch rather than making the operator
     * pay for the scan again to re-read what they just saw.
     */
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: false,
  });
  return { ...query, canVerify: query.access.allowed };
}
