"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  hrStore,
  type BulkImportSession,
  type HrDirectoryFilters,
  type HrDirectoryView,
  type HrUiState,
} from "./hr-store";

interface HrContextValue {
  state: HrUiState;
  setDirectoryView: (view: HrDirectoryView) => void;
  setDirectoryFilters: (filters: Partial<HrDirectoryFilters>) => void;
  resetDirectoryFilters: () => void;
  setBulkImportSession: (session: BulkImportSession | null) => void;
  clearBulkImportSession: () => void;
  setLastPath: (path: string | null) => void;
  reset: () => void;
}

const HrContext = createContext<HrContextValue | null>(null);

function useHrStoreSnapshot(): HrUiState {
  return useSyncExternalStore(hrStore.subscribe, hrStore.getState, hrStore.getState);
}

export function HrProvider({ children }: { children: ReactNode }) {
  const state = useHrStoreSnapshot();

  const setDirectoryView = useCallback((view: HrDirectoryView) => {
    hrStore.setDirectoryView(view);
  }, []);

  const setDirectoryFilters = useCallback((filters: Partial<HrDirectoryFilters>) => {
    hrStore.setDirectoryFilters(filters);
  }, []);

  const resetDirectoryFilters = useCallback(() => {
    hrStore.resetDirectoryFilters();
  }, []);

  const setBulkImportSession = useCallback((session: BulkImportSession | null) => {
    hrStore.setBulkImportSession(session);
  }, []);

  const clearBulkImportSession = useCallback(() => {
    hrStore.clearBulkImportSession();
  }, []);

  const setLastPath = useCallback((path: string | null) => {
    hrStore.setLastPath(path);
  }, []);

  const reset = useCallback(() => {
    hrStore.reset();
  }, []);

  const value = useMemo<HrContextValue>(
    () => ({
      state,
      setDirectoryView,
      setDirectoryFilters,
      resetDirectoryFilters,
      setBulkImportSession,
      clearBulkImportSession,
      setLastPath,
      reset,
    }),
    [
      state,
      setDirectoryView,
      setDirectoryFilters,
      resetDirectoryFilters,
      setBulkImportSession,
      clearBulkImportSession,
      setLastPath,
      reset,
    ],
  );

  return <HrContext.Provider value={value}>{children}</HrContext.Provider>;
}

export function useHr(): HrContextValue {
  const ctx = useContext(HrContext);
  if (!ctx) {
    throw new Error("useHr must be used within HrProvider (HR layout)");
  }
  return ctx;
}

/** Optional: read store outside provider (e.g. non-React helpers). Prefer useHr in components. */
export function useHrStore(): HrUiState {
  return useHrStoreSnapshot();
}

export { HrContext };
