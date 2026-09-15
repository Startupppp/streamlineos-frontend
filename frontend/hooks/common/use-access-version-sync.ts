"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Query } from "@tanstack/react-query";
import { useAccess } from "@/hooks/api/access";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";

const ACCESS_NAMESPACE = platformCoreQueryKeys.access.all;

export function isAccessNamespaceKey(queryKey: readonly unknown[]): boolean {
  return ACCESS_NAMESPACE.every((segment, index) => queryKey[index] === segment);
}

function isOutsideAccessNamespace(query: Query): boolean {
  return !isAccessNamespaceKey(query.queryKey);
}

export function useAccessVersionSync(): void {
  const queryClient = useQueryClient();
  const { data } = useAccess({
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const version = data?.version;
  const seenVersion = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (version === undefined) return;
    if (seenVersion.current === undefined) {
      seenVersion.current = version;
      return;
    }
    if (seenVersion.current === version) return;
    seenVersion.current = version;
    queryClient.removeQueries({
      type: "inactive",
      predicate: isOutsideAccessNamespace,
    });
    void queryClient.invalidateQueries({
      refetchType: "active",
      predicate: isOutsideAccessNamespace,
    });
  }, [version, queryClient]);
}
