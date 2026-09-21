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

interface DirtyStateContextValue {
  registerDirty: (id: string, isDirty: boolean) => void;
  unregisterDirty: (id: string) => void;
  hasUnsavedWork: boolean;
  requestLeave: (action: () => void) => void;
}

const DirtyStateContext = createContext<DirtyStateContextValue | null>(null);

interface DirtyStateProviderProps {
  children: ReactNode;
}

export function DirtyStateProvider({ children }: DirtyStateProviderProps) {
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
    handleBrowserBack: true,
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
    <DirtyStateContext.Provider value={value}>
      {children}
      <UnsavedChangesDialog {...dialogProps} />
    </DirtyStateContext.Provider>
  );
}

export function useRegisterDirtyState(isDirty: boolean): void {
  const context = useContext(DirtyStateContext);
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

export function useHasUnsavedWork(): boolean {
  const context = useContext(DirtyStateContext);
  return context?.hasUnsavedWork ?? false;
}

export function useNavigationLeave(): (action: () => void) => void {
  const context = useContext(DirtyStateContext);
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
