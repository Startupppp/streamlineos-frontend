"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import { lazyContract } from "@/lib/api-envelope";
import type { Entitlements } from "@/hooks/api/entitlements-schema";

export type {
  Entitlements,
  EntitlementLimit,
} from "@/hooks/api/entitlements-schema";

/** Deferred: the product switcher in the shell header imports this hook. */
const entitlementsResponseContract = lazyContract(() =>
  import("@/hooks/api/entitlements-schema").then((m) => m.entitlementsContract),
);

export function useEntitlements(enabled = true) {
  return useQuery<Entitlements, Error>({
    queryKey: growthAndSignQueryKeys.billing.entitlements(),
    queryFn: ({ signal }) =>
      apiClient.get("/billing/entitlements", undefined, signal, entitlementsResponseContract),
    staleTime: 900_000,
    retry: false,
    enabled,
  });
}
