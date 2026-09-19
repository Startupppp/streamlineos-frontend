"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface BuildDirtyStateContextValue {
  registerDirty: (id: string, isDirty: boolean) => void;
  unregisterDirty: (id: string) => void;
  hasUnsavedWork: boolean;
}

const BuildDirtyStateContext =
  createContext<BuildDirtyStateContextValue | null>(null);

interface BuildDirtyStateProviderProps {
  children: ReactNode;
}

export function BuildDirtyStateProvider({
  children,
}: BuildDirtyStateProviderProps) {
  const [dirtyIds, setDirtyIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const registerDirty = useCallback((id: string, isDirty: boolean) => {
    setDirtyIds((current) => {
      const hasId = current.has(id);
      if (isDirty === hasId) return current;
      const next = new Set(current);
      if (isDirty) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const unregisterDirty = useCallback((id: string) => {
    setDirtyIds((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      registerDirty,
      unregisterDirty,
      hasUnsavedWork: dirtyIds.size > 0,
    }),
    [registerDirty, unregisterDirty, dirtyIds],
  );

  return (
    <BuildDirtyStateContext.Provider value={value}>
      {children}
    </BuildDirtyStateContext.Provider>
  );
}

export function useRegisterBuildDirtyState(isDirty: boolean): void {
  const context = useContext(BuildDirtyStateContext);
  const id = useId();
  const registerDirty = context?.registerDirty;
  const unregisterDirty = context?.unregisterDirty;

  useEffect(() => {
    if (!registerDirty) return;
    registerDirty(id, isDirty);
  }, [registerDirty, id, isDirty]);

  useEffect(() => {
    if (!unregisterDirty) return undefined;
    return () => unregisterDirty(id);
  }, [unregisterDirty, id]);
}

export function useBuildHasUnsavedWork(): boolean {
  const context = useContext(BuildDirtyStateContext);
  return context?.hasUnsavedWork ?? false;
}
