"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Query } from "@tanstack/react-query";
import { useAccess } from "@/hooks/api/access";
import { useConfirmedSessionClaimsRefresh } from "@/hooks/common/use-confirmed-session-claims-refresh";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";

const ACCESS_NAMESPACE = platformCoreQueryKeys.access.all;

export function isAccessNamespaceKey(queryKey: readonly unknown[]): boolean {
  return ACCESS_NAMESPACE.every((segment, index) => queryKey[index] === segment);
}

function isOutsideAccessNamespace(query: Query): boolean {
  return !isAccessNamespaceKey(query.queryKey);
}

const CLAIM_REFRESH_ATTEMPTS = 2;

// The access namespace is excluded from the sweep because it is this effect's own input.
export function useAccessVersionSync(): void {
  const queryClient = useQueryClient();
  const beginClaimsRefresh = useConfirmedSessionClaimsRefresh();
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
  const attemptVersion = useRef<number | undefined>(undefined);
  const attemptCount = useRef(0);

  useEffect(() => {
    if (version === undefined) return;
    if (seenVersion.current === undefined) {
      seenVersion.current = version;
      return;
    }
    if (seenVersion.current === version) return;
    if (
      attemptVersion.current === version &&
      attemptCount.current >= CLAIM_REFRESH_ATTEMPTS
    )
      return;
    pendingVersion.current = version;
    if (isSyncing.current) return;

    const syncPendingVersions = async () => {
      isSyncing.current = true;
      while (pendingVersion.current !== undefined) {
        const nextVersion = pendingVersion.current;
        pendingVersion.current = undefined;
        if (seenVersion.current === nextVersion) continue;
        if (attemptVersion.current !== nextVersion) {
          attemptVersion.current = nextVersion;
          attemptCount.current = 0;
        }
        if (attemptCount.current >= CLAIM_REFRESH_ATTEMPTS) continue;
        attemptCount.current += 1;

        if (attemptCount.current === 1) {
          queryClient.removeQueries({
            type: "inactive",
            predicate: isOutsideAccessNamespace,
          });
          void queryClient.invalidateQueries({
            refetchType: "active",
            predicate: isOutsideAccessNamespace,
          });
        }

        const outcome = await beginClaimsRefresh().confirm();
        if (outcome.status === "confirmed") {
          seenVersion.current = nextVersion;
          continue;
        }
        if (outcome.status === "superseded") continue;
        if (
          pendingVersion.current === undefined &&
          attemptCount.current < CLAIM_REFRESH_ATTEMPTS
        )
          pendingVersion.current = nextVersion;
      }
      isSyncing.current = false;
    };

    void syncPendingVersions();
  }, [version, queryClient, beginClaimsRefresh]);
}
