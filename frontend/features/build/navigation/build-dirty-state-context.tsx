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
import { useUnsavedChangesGuard } from "@/hooks/common/use-unsaved-changes-guard";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";

interface BuildDirtyStateContextValue {
  registerDirty: (id: string, isDirty: boolean) => void;
  unregisterDirty: (id: string) => void;
  hasUnsavedWork: boolean;
  requestLeave: (action: () => void) => void;
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

  const hasUnsavedWork = dirtyIds.size > 0;
  const { requestLeave, dialogProps } = useUnsavedChangesGuard({
    isDirty: hasUnsavedWork,
  });

  const value = useMemo(
    () => ({
      registerDirty,
      unregisterDirty,
      hasUnsavedWork,
      requestLeave,
    }),
    [registerDirty, unregisterDirty, hasUnsavedWork, requestLeave],
  );

  return (
    <BuildDirtyStateContext.Provider value={value}>
      {children}
      <UnsavedChangesDialog {...dialogProps} />
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

export function useBuildRequestLeave(): (action: () => void) => void {
  const context = useContext(BuildDirtyStateContext);
  const requestLeave = context?.requestLeave;
  return useCallback(
    (action: () => void) => {
      if (!requestLeave) {
        action();
        return;
      }
      requestLeave(action);
    },
    [requestLeave],
  );
}
