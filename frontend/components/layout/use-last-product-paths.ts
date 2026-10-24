"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  orgScopedStorageKey,
  useOrgStorageScope,
} from "@/lib/org-scoped-storage";
import {
  LAST_PRODUCT_PATHS_STORAGE,
  emptyLastProductPaths,
  getLastProductPathsSnapshot,
  subscribeLastProductPaths,
  type LastProductPaths,
} from "./last-product-path";

export function useLastProductPaths(): LastProductPaths {
  const scope = useOrgStorageScope();
  const storageKey = orgScopedStorageKey(LAST_PRODUCT_PATHS_STORAGE, scope);
  const getSnapshot = useCallback(
    () => getLastProductPathsSnapshot(storageKey),
    [storageKey],
  );
  return useSyncExternalStore(
    subscribeLastProductPaths,
    getSnapshot,
    emptyLastProductPaths,
  );
}
