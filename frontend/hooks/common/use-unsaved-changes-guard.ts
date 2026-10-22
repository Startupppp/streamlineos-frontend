"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UnsavedChangesDialogProps } from "@/components/ui/unsaved-changes-dialog";

type UseUnsavedChangesGuardOptions = {
  isDirty: boolean;
  onSave?: () => void | Promise<void>;
  onDiscard?: () => void;
  enabled?: boolean;
  saveMode?: "leave" | "stay";
  handleBrowserBack?: boolean;
};

type UseUnsavedChangesGuardResult = {
  requestLeave: (action: () => void) => void;
  dialogProps: UnsavedChangesDialogProps;
};

export function useUnsavedChangesGuard({
  isDirty,
  onSave,
  onDiscard,
  enabled = true,
  saveMode = "leave",
  handleBrowserBack = false,
}: UseUnsavedChangesGuardOptions): UseUnsavedChangesGuardResult {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [enabled, isDirty]);

  const clearPending = useCallback(() => {
    pendingActionRef.current = null;
  }, []);

  const requestLeave = useCallback(
    (action: () => void) => {
      if (!enabled || !isDirty) {
        action();
        return;
      }
      pendingActionRef.current = action;
      setOpen(true);
    },
    [enabled, isDirty],
  );

  useEffect(() => {
    if (!enabled || !isDirty || !handleBrowserBack) return;
    let restoring = false;
    let authorizedLeave = false;
    function onPopState() {
      if (restoring) {
        restoring = false;
        return;
      }
      if (authorizedLeave) {
        authorizedLeave = false;
        return;
      }
      restoring = true;
      history.go(1);
      requestLeave(() => {
        authorizedLeave = true;
        history.back();
      });
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [enabled, isDirty, handleBrowserBack, requestLeave]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (isSaving) return;
      setOpen(next);
      if (!next) clearPending();
    },
    [clearPending, isSaving],
  );

  const handleDiscard = useCallback(() => {
    onDiscard?.();
    const action = pendingActionRef.current;
    clearPending();
    setOpen(false);
    action?.();
  }, [clearPending, onDiscard]);

  const handleSave = useCallback(async () => {
    if (!onSave) {
      handleDiscard();
      return;
    }
    setIsSaving(true);
    try {
      await onSave();
      if (saveMode === "leave") {
        const action = pendingActionRef.current;
        clearPending();
        setOpen(false);
        action?.();
      } else {
        clearPending();
        setOpen(false);
      }
    } catch {
    } finally {
      setIsSaving(false);
    }
  }, [clearPending, handleDiscard, onSave, saveMode]);

  return {
    requestLeave,
    dialogProps: {
      open,
      onOpenChange: handleOpenChange,
      onDiscard: handleDiscard,
      onSave: onSave
        ? () => {
            void handleSave();
          }
        : undefined,
      isSaving,
    },
  };
}
