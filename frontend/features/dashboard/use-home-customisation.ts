"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  orgScopedStorageKey,
  useOrgStorageScope,
} from "@/lib/org-scoped-storage";

export type HomeDensity = "compact" | "comfortable";

const STORAGE_NAME = "home-widget-customisation";

export interface HomeCustomisationState {
  hiddenWidgets: readonly string[];
  density: HomeDensity;
  widgetOrder: readonly string[];
}

export const HOME_CUSTOMISATION_DEFAULT: HomeCustomisationState = {
  hiddenWidgets: [],
  density: "comfortable",
  widgetOrder: [],
};

export function applyWidgetOrder(
  allIds: readonly string[],
  widgetOrder: readonly string[],
): readonly string[] {
  const orderMap = new Map(widgetOrder.map((id, i) => [id, i]));
  const known = allIds
    .filter((id) => orderMap.has(id))
    .sort(
      (a, b) => (orderMap.get(a) ?? Infinity) - (orderMap.get(b) ?? Infinity),
    );
  const unknown = allIds.filter((id) => !orderMap.has(id));
  return [...known, ...unknown];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readState(storageKey: string): HomeCustomisationState {
  if (typeof window === "undefined") return HOME_CUSTOMISATION_DEFAULT;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw === null) return HOME_CUSTOMISATION_DEFAULT;
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) return HOME_CUSTOMISATION_DEFAULT;
    const hiddenWidgets = Array.isArray(parsed.hiddenWidgets)
      ? parsed.hiddenWidgets.filter((s): s is string => typeof s === "string")
      : [];
    const rawDensity = parsed.density;
    const density: HomeDensity =
      rawDensity === "compact" || rawDensity === "comfortable"
        ? rawDensity
        : "comfortable";
    const widgetOrder = Array.isArray(parsed.widgetOrder)
      ? parsed.widgetOrder.filter((s): s is string => typeof s === "string")
      : [];
    return { hiddenWidgets, density, widgetOrder };
  } catch {
    return HOME_CUSTOMISATION_DEFAULT;
  }
}

function writeState(storageKey: string, state: HomeCustomisationState): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    return;
  }
}

export interface UseHomeCustomisationResult {
  state: HomeCustomisationState;
  toggleWidgetVisibility: (widgetId: string) => void;
  setDensity: (density: HomeDensity) => void;
  moveWidget: (
    widgetId: string,
    direction: "up" | "down",
    allIds: readonly string[],
  ) => void;
  reset: () => void;
  isHidden: (widgetId: string) => boolean;
}

export function useHomeCustomisation(): UseHomeCustomisationResult {
  const scope = useOrgStorageScope();
  const storageKey = orgScopedStorageKey(STORAGE_NAME, scope);
  const prevKeyRef = useRef(storageKey);

  const [state, setState] = useState<HomeCustomisationState>(() =>
    readState(storageKey),
  );

  useEffect(() => {
    if (prevKeyRef.current === storageKey) return;
    prevKeyRef.current = storageKey;
    setState(readState(storageKey));
  }, [storageKey]);

  const update = useCallback(
    (next: HomeCustomisationState) => {
      writeState(storageKey, next);
      setState(next);
    },
    [storageKey],
  );

  const toggleWidgetVisibility = useCallback(
    (widgetId: string) => {
      const next: HomeCustomisationState = state.hiddenWidgets.includes(
        widgetId,
      )
        ? {
            ...state,
            hiddenWidgets: state.hiddenWidgets.filter((id) => id !== widgetId),
          }
        : { ...state, hiddenWidgets: [...state.hiddenWidgets, widgetId] };
      update(next);
    },
    [state, update],
  );

  const setDensity = useCallback(
    (density: HomeDensity) => {
      update({ ...state, density });
    },
    [state, update],
  );

  const moveWidget = useCallback(
    (widgetId: string, direction: "up" | "down", allIds: readonly string[]) => {
      const effective = [...applyWidgetOrder(allIds, state.widgetOrder)];
      const idx = effective.indexOf(widgetId);
      if (idx === -1) return;
      if (direction === "up" && idx > 0) {
        [effective[idx - 1], effective[idx]] = [
          effective[idx],
          effective[idx - 1],
        ];
      } else if (direction === "down" && idx < effective.length - 1) {
        [effective[idx + 1], effective[idx]] = [
          effective[idx],
          effective[idx + 1],
        ];
      } else {
        return;
      }
      update({ ...state, widgetOrder: effective });
    },
    [state, update],
  );

  const reset = useCallback(() => {
    update(HOME_CUSTOMISATION_DEFAULT);
  }, [update]);

  const isHidden = useCallback(
    (widgetId: string) => state.hiddenWidgets.includes(widgetId),
    [state.hiddenWidgets],
  );

  return {
    state,
    toggleWidgetVisibility,
    setDensity,
    moveWidget,
    reset,
    isHidden,
  };
}
