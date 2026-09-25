"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiClient } from "@/lib/api-client";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import { lazyContract } from "@/lib/api-envelope";
import type { Entitlements } from "@/hooks/api/entitlements-schema";

export type {
  Entitlements,
  EntitlementLimit,
} from "@/hooks/api/entitlements-schema";

export const ENTITLEMENTS_INVALIDATION_KEY_PREFIX = "entitlements:invalidated";

export function signalEntitlementsInvalidation(orgId: string): void {
  try {
    localStorage.setItem(`${ENTITLEMENTS_INVALIDATION_KEY_PREFIX}:${orgId}`, Date.now().toString());
  } catch {}
}

/** Deferred: the product switcher in the shell header imports this hook. */
const entitlementsResponseContract = lazyContract(() =>
  import("@/hooks/api/entitlements-schema").then((m) => m.entitlementsContract),
);

export function useEntitlements(enabled = true) {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!orgId) return;
    const storageKey = `${ENTITLEMENTS_INVALIDATION_KEY_PREFIX}:${orgId}`;
    function handleStorage(event: StorageEvent) {
      if (event.key !== storageKey) return;
      queryClient.invalidateQueries({ queryKey: growthAndSignQueryKeys.billing.entitlements() });
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [queryClient, orgId]);

  return useQuery<Entitlements, Error>({
    queryKey: growthAndSignQueryKeys.billing.entitlements(),
    queryFn: ({ signal }) =>
      apiClient.get("/billing/entitlements", undefined, signal, entitlementsResponseContract),
    staleTime: 900_000,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: true,
    retry: false,
    enabled,
    throwOnError: false,
  });
}
