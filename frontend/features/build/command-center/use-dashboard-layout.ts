"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isApiError } from "@/lib/api-envelope";
import { useDashboardLayout, useSaveDashboardLayout } from "@/hooks/api/build/dashboard-layout";
import type { DashboardLayoutConfig, PersonaKey, WidgetSlot, WidgetType } from "./dashboard-layout";
import { PERSONA_DEFAULTS } from "./dashboard-layout";

const DEBOUNCE_MS = 800;

export interface UseDashboardLayoutReturn {
  config: DashboardLayoutConfig;
  layoutVersion: number;
  isPending: boolean;
  reorder: (fromIndex: number, toIndex: number) => void;
  removeWidget: (type: WidgetType) => void;
  addWidget: (slot: WidgetSlot) => void;
  resetToDefault: (persona: PersonaKey) => void;
}

export function useDashboardLayoutEditor(onConflict?: () => void): UseDashboardLayoutReturn {
  const { data, refetch } = useDashboardLayout();
  const { mutate: save, isPending } = useSaveDashboardLayout();

  const [localConfig, setLocalConfig] = useState<DashboardLayoutConfig>(
    () => data?.config ?? { widgets: [] },
  );
  const [localVersion, setLocalVersion] = useState<number>(data?.layoutVersion ?? 0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (data) {
      setLocalConfig(data.config);
      setLocalVersion(data.layoutVersion);
    }
  }, [data]);

  const persist = useCallback(
    (config: DashboardLayoutConfig, version: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        save(
          { layoutVersion: version, config },
          {
            onSuccess: (saved) => {
              setLocalVersion(saved.layoutVersion);
            },
            onError: (error) => {
              if (isApiError(error) && error.status === 409) {
                void refetch();
                onConflict?.();
              }
            },
          },
        );
      }, DEBOUNCE_MS);
    },
    [save, refetch, onConflict],
  );

  const reorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      setLocalConfig((prev) => {
        const next = [...prev.widgets];
        const [moved] = next.splice(fromIndex, 1);
        if (moved) next.splice(toIndex, 0, moved);
        const updated = { widgets: next };
        persist(updated, localVersion);
        return updated;
      });
    },
    [persist, localVersion],
  );

  const removeWidget = useCallback(
    (type: WidgetType) => {
      setLocalConfig((prev) => {
        const updated = { widgets: prev.widgets.filter((w) => w.type !== type) };
        persist(updated, localVersion);
        return updated;
      });
    },
    [persist, localVersion],
  );

  const addWidget = useCallback(
    (slot: WidgetSlot) => {
      setLocalConfig((prev) => {
        const updated = { widgets: [...prev.widgets, slot] };
        persist(updated, localVersion);
        return updated;
      });
    },
    [persist, localVersion],
  );

  const resetToDefault = useCallback(
    (persona: PersonaKey) => {
      const defaults = PERSONA_DEFAULTS[persona];
      setLocalConfig(defaults);
      persist(defaults, localVersion);
    },
    [persist, localVersion],
  );

  return {
    config: localConfig,
    layoutVersion: localVersion,
    isPending,
    reorder,
    removeWidget,
    addWidget,
    resetToDefault,
  };
}
