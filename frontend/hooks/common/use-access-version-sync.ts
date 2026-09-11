"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Query } from "@tanstack/react-query";
import { useAccess } from "@/hooks/api/access";
import { useSessionClaimsRefresh } from "@/hooks/common/auth-hooks";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";

const ACCESS_NAMESPACE = platformCoreQueryKeys.access.all;

export function isAccessNamespaceKey(queryKey: readonly unknown[]): boolean {
  return ACCESS_NAMESPACE.every((segment, index) => queryKey[index] === segment);
}

function isOutsideAccessNamespace(query: Query): boolean {
  return !isAccessNamespaceKey(query.queryKey);
}

// The access namespace is excluded from the sweep because it is this effect's own input.
export function useAccessVersionSync(): void {
  const queryClient = useQueryClient();
  const refreshSessionClaims = useSessionClaimsRefresh();
  const { data } = useAccess({
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const version = data?.version;
  const seenVersion = useRef<number | undefined>(undefined);
  const isSyncing = useRef(false);
  const pendingVersion = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (version === undefined) return;
    if (seenVersion.current === undefined) {
      seenVersion.current = version;
      return;
    }
    if (seenVersion.current === version) return;
    pendingVersion.current = version;
    if (isSyncing.current) return;

    const syncPendingVersions = async () => {
      isSyncing.current = true;
      while (pendingVersion.current !== undefined) {
        const nextVersion = pendingVersion.current;
        pendingVersion.current = undefined;
        if (seenVersion.current === nextVersion) continue;
        seenVersion.current = nextVersion;

        queryClient.removeQueries({
          type: "inactive",
          predicate: isOutsideAccessNamespace,
        });
        void queryClient.invalidateQueries({
          refetchType: "active",
          predicate: isOutsideAccessNamespace,
        });
        await refreshSessionClaims();
      }
      isSyncing.current = false;
    };

    void syncPendingVersions();
  }, [version, queryClient, refreshSessionClaims]);
}
