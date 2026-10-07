"use client";

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import type { Layout } from "react-grid-layout";
import { useAccess, useCan } from "@/hooks/api/access";
import { useDashboardLayout, useSaveDashboardLayout } from "@/hooks/api/build/dashboard-layout";
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

const CONFLICT_MESSAGE = "Your layout was changed in another tab. Showing the latest version.";

function samePositions(a: readonly WidgetSlot[], b: readonly WidgetSlot[]): boolean {
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
  const { mutate: save } = useSaveDashboardLayout();

  const isAllowed = useCallback(
    (type: WidgetType) => {
      const permissionKey = WIDGET_CATALOG[type].permissionKey;
      return permissionKey === null || grantsPermission(access, permissionKey);
    },
    [access],
  );

  const savedSlots = useMemo<readonly WidgetSlot[]>(
    () =>
      !stored || (stored.layoutVersion === 0 && stored.config.widgets.length === 0)
        ? DEFAULT_WIDGETS
        : stored.config.widgets,
    [stored],
  );

  const widgets = useMemo(() => normalizeSlots(savedSlots, isAllowed), [savedSlots, isAllowed]);

  const hiddenSlots = useMemo(
    () => savedSlots.filter((slot) => !isAllowed(slot.type)),
    [savedSlots, isAllowed],
  );

  const availableTypes = useMemo(
    () => DEFAULT_WIDGETS.map((slot) => slot.type).filter(isAllowed),
    [isAllowed],
  );

  const commit = useCallback(
    (next: WidgetSlot[]) => {
      if (samePositions(next, widgets)) return;
      save(
        { widgets: [...next, ...hiddenSlots] },
        {
          onError: (error) => {
            toast.error(isApiError(error) && error.status === 409 ? CONFLICT_MESSAGE : getErrorMessage(error));
          },
        },
      );
    },
    [save, widgets, hiddenSlots],
  );

  const applyLayout = useCallback(
    (layout: Layout) => commit(slotsFromLayout(layout, widgets)),
    [commit, widgets],
  );
  const applyStackedLayout = useCallback(
    (layout: Layout) => commit(slotsFromStackedLayout(layout, widgets)),
    [commit, widgets],
  );
  const addWidget = useCallback((type: WidgetType) => commit(withWidget(widgets, type)), [commit, widgets]);
  const removeWidget = useCallback((type: WidgetType) => commit(withoutWidget(widgets, type)), [commit, widgets]);
  const moveWidget = useCallback(
    (type: WidgetType, offset: -1 | 1) => commit(withWidgetMoved(widgets, type, offset)),
    [commit, widgets],
  );
  const resetLayout = useCallback(
    () => commit(normalizeSlots(DEFAULT_WIDGETS, isAllowed)),
    [commit, isAllowed],
  );

  return {
    widgets,
    availableTypes,
    isLoading,
    canCustomize: canManage && stored !== undefined,
    applyLayout,
    applyStackedLayout,
    addWidget,
    removeWidget,
    moveWidget,
    resetLayout,
  };
}
