"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  entitlementsContract,
  type Entitlements,
} from "@/hooks/api/entitlements-schema";

export type {
  Entitlements,
  EntitlementLimit,
} from "@/hooks/api/entitlements-schema";

export function useEntitlements(enabled = true) {
  return useQuery<Entitlements, Error>({
    queryKey: queryKeys.billing.entitlements(),
    queryFn: ({ signal }) =>
      apiClient.get("/billing/entitlements", undefined, signal, entitlementsContract),
    staleTime: 900_000,
    retry: false,
    enabled,
  });
}
