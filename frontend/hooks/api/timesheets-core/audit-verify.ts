"use client";

import { apiClient } from "@/lib/api-client";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { useGatedQuery } from "@/hooks/api/gated-query";
import type { AuditChainVerification } from "@/features/timesheets/types";

export function useVerifyAuditChain() {
  const query = useGatedQuery("timesheets:audit:view", {
    queryKey: usersAndCommerceQueryKeys.timesheets.auditVerify(),
    queryFn: ({ signal }) =>
      apiClient.get<AuditChainVerification>("/timesheets/audit/verify", undefined, signal),
    enabled: false,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: false,
  });
  return { ...query, canVerify: query.access.allowed };
}
