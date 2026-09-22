"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  orgScopedStorageKey,
  useOrgStorageScope,
} from "@/lib/org-scoped-storage";

export type HomeDensity = "compact" | "comfortable";

const STORAGE_NAME = "home-widget-customisation";

export const HOME_CUSTOMISATION_DEFAULT: HomeCustomisationState = {
  hiddenWidgets: [],
  widgetOrder: [],
  density: "comfortable",
};

export interface HomeCustomisationState {
  hiddenWidgets: readonly string[];
  widgetOrder: readonly string[];
  density: HomeDensity;
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
    const widgetOrder = Array.isArray(parsed.widgetOrder)
      ? parsed.widgetOrder.filter((s): s is string => typeof s === "string")
      : [];
    const rawDensity = parsed.density;
    const density: HomeDensity =
      rawDensity === "compact" || rawDensity === "comfortable"
        ? rawDensity
        : "comfortable";
    return { hiddenWidgets, widgetOrder, density };
  } catch {
    return HOME_CUSTOMISATION_DEFAULT;
  }
}

function writeState(storageKey: string, state: HomeCustomisationState): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
}

export interface UseHomeCustomisationResult {
  state: HomeCustomisationState;
  toggleWidgetVisibility: (widgetId: string) => void;
  setDensity: (density: HomeDensity) => void;
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
      const next: HomeCustomisationState = state.hiddenWidgets.includes(widgetId)
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

  const reset = useCallback(() => {
    update(HOME_CUSTOMISATION_DEFAULT);
  }, [update]);

  const isHidden = useCallback(
    (widgetId: string) => state.hiddenWidgets.includes(widgetId),
    [state.hiddenWidgets],
  );

  return { state, toggleWidgetVisibility, setDensity, reset, isHidden };
}
