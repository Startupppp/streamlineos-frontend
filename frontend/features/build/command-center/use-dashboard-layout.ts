"use client";

import { useCallback, useMemo, useState, type SetStateAction } from "react";
import { toast } from "sonner";
import type { Layout } from "react-grid-layout";
import { useAccess, useCan } from "@/hooks/api/access";
import {
  useDashboardLayout,
  useSaveDashboardLayout,
} from "@/hooks/api/build/dashboard-layout";
import { useSourceOverride } from "@/hooks/common/use-source-override";
import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { grantsPermission } from "@/lib/rbac/permission-gate";
import {
  DEFAULT_WIDGETS,
  normalizeSlots,
  slotsFromLayout,
  slotsFromStackedLayout,
  withoutWidget,
  withWidget,
  withWidgetMoved,
  type WidgetSlot,
  type WidgetType,
} from "./dashboard-layout";
import { WIDGET_CATALOG } from "./widget-catalog";

const CONFLICT_MESSAGE =
  "Your layout changed in another tab. Your draft is still here. Review it, then click Done again to replace the newer layout.";

function samePositions(
  a: readonly WidgetSlot[],
  b: readonly WidgetSlot[],
): boolean {
  if (a.length !== b.length) return false;
  const byType = new Map(b.map((slot) => [slot.type, slot.position]));
  return a.every((slot) => {
    const other = byType.get(slot.type);
    return (
      other !== undefined &&
      other.col === slot.position.col &&
      other.row === slot.position.row &&
      other.w === slot.position.w &&
      other.h === slot.position.h
    );
  });
}

export function useDashboardLayoutEditor() {
  const { data: access } = useAccess();
  const canManage = useCan("build:dashboard:manage");
  const { data: stored, isLoading } = useDashboardLayout();
  const { mutate: save, isPending: isSaving } = useSaveDashboardLayout();

  const isAllowed = useCallback(
    (type: WidgetType) => {
      const permissionKey = WIDGET_CATALOG[type].permissionKey;
      return permissionKey === null || grantsPermission(access, permissionKey);
    },
    [access],
  );

  const savedSlots = useMemo<readonly WidgetSlot[]>(
    () =>
      !stored ||
      (stored.layoutVersion === 0 && stored.config.widgets.length === 0)
        ? DEFAULT_WIDGETS
        : stored.config.widgets,
    [stored],
  );

  const savedWidgets = useMemo(
    () => normalizeSlots(savedSlots, isAllowed),
    [savedSlots, isAllowed],
  );
  const draftSource = `${stored?.layoutVersion ?? "loading"}:${availablePermissionSignature(access)}`;
  const [isDirty, setIsDirty] = useState(false);
  const [draftBaseVersion, setDraftBaseVersion] = useState<number | null>(null);
  const [canOverwriteConflict, setCanOverwriteConflict] = useState(false);
  const [draftWidgets, setWidgets] = useSourceOverride(
    draftSource,
    savedWidgets,
    isDirty,
  );
  const widgets = useMemo(
    () => normalizeSlots(draftWidgets, isAllowed),
    [draftWidgets, isAllowed],
  );

  const hiddenSlots = useMemo(
    () => savedSlots.filter((slot) => !isAllowed(slot.type)),
    [savedSlots, isAllowed],
  );

  const availableTypes = useMemo(
    () => DEFAULT_WIDGETS.map((slot) => slot.type).filter(isAllowed),
    [isAllowed],
  );

  const saveLayout = useCallback(
    (onSuccess?: () => void) => {
      if (isSaving) return;
      if (samePositions(widgets, savedWidgets)) {
        setIsDirty(false);
        setDraftBaseVersion(null);
        setCanOverwriteConflict(false);
        onSuccess?.();
        return;
      }
      save(
        {
          layoutVersion: canOverwriteConflict
            ? (stored?.layoutVersion ?? draftBaseVersion ?? 0)
            : (draftBaseVersion ?? stored?.layoutVersion ?? 0),
          config: { widgets: [...widgets, ...hiddenSlots] },
        },
        {
          onSuccess: () => {
            setIsDirty(false);
            setDraftBaseVersion(null);
            setCanOverwriteConflict(false);
            onSuccess?.();
          },
          onError: (error) => {
            if (isApiError(error) && error.status === 409) {
              setCanOverwriteConflict(true);
              toast.error(CONFLICT_MESSAGE);
              return;
            }
            toast.error(getErrorMessage(error));
          },
        },
      );
    },
    [
      canOverwriteConflict,
      draftBaseVersion,
      hiddenSlots,
      isSaving,
      save,
      savedWidgets,
      stored?.layoutVersion,
      widgets,
    ],
  );

  const updateWidgets = useCallback(
    (action: SetStateAction<WidgetSlot[]>) => {
      if (isSaving) return;
      setIsDirty(true);
      setDraftBaseVersion((current) => current ?? stored?.layoutVersion ?? 0);
      setWidgets(action);
    },
    [isSaving, setWidgets, stored?.layoutVersion],
  );

  const applyLayout = useCallback(
    (layout: Layout) =>
      updateWidgets((current) => slotsFromLayout(layout, current)),
    [updateWidgets],
  );
  const applyStackedLayout = useCallback(
    (layout: Layout) =>
      updateWidgets((current) => slotsFromStackedLayout(layout, current)),
    [updateWidgets],
  );
  const addWidget = useCallback(
    (type: WidgetType) => updateWidgets((current) => withWidget(current, type)),
    [updateWidgets],
  );
  const removeWidget = useCallback(
    (type: WidgetType) =>
      updateWidgets((current) => withoutWidget(current, type)),
    [updateWidgets],
  );
  const moveWidget = useCallback(
    (type: WidgetType, offset: -1 | 1) =>
      updateWidgets((current) => withWidgetMoved(current, type, offset)),
    [updateWidgets],
  );
  const resetLayout = useCallback(
    () => {
      if (isSaving) return;
      setWidgets([...savedWidgets]);
      setIsDirty(false);
      setDraftBaseVersion(null);
      setCanOverwriteConflict(false);
    },
    [isSaving, savedWidgets, setWidgets],
  );

  return {
    widgets,
    availableTypes,
    isLoading,
    isSaving,
    canCustomize: canManage && stored !== undefined,
    applyLayout,
    applyStackedLayout,
    addWidget,
    removeWidget,
    moveWidget,
    resetLayout,
    saveLayout,
  };
}

function availablePermissionSignature(
  access: ReturnType<typeof useAccess>["data"],
): string {
  if (!access) return "pending";
  return DEFAULT_WIDGETS.filter((slot) => {
    const permissionKey = WIDGET_CATALOG[slot.type].permissionKey;
    return permissionKey === null || grantsPermission(access, permissionKey);
  })
    .map((slot) => slot.type)
    .join(",");
}
