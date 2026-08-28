"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccess } from "@/hooks/api/access";
import { queryKeys } from "@/lib/query-keys";

export function useHomeCacheSync(): void {
  const queryClient = useQueryClient();
  const { data } = useAccess();
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
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  }, [version, queryClient]);
}
