"use client";

import { useCallback, useEffect, useState } from "react";

const PREFS_KEY = "streamlineos:project-sidebar:prefs:v1";

export interface ProjectSidebarPrefs {
  hiddenItems: string[];
}

const DEFAULT_PREFS: ProjectSidebarPrefs = {
  hiddenItems: [],
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function loadPrefs(): ProjectSidebarPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { ...DEFAULT_PREFS };
    return {
      hiddenItems: Array.isArray(parsed.hiddenItems)
        ? parsed.hiddenItems.filter((v): v is string => typeof v === "string")
        : [],
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function savePrefs(prefs: ProjectSidebarPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

export function useProjectSidebarPrefs(): {
  hiddenItems: ReadonlySet<string>;
  toggleItem: (itemLabel: string) => void;
  resetPrefs: () => void;
} {
  const [prefs, setPrefs] = useState<ProjectSidebarPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  const toggleItem = useCallback((itemLabel: string) => {
    setPrefs((prev) => {
      const next: ProjectSidebarPrefs = prev.hiddenItems.includes(itemLabel)
        ? { ...prev, hiddenItems: prev.hiddenItems.filter((l) => l !== itemLabel) }
        : { ...prev, hiddenItems: [...prev.hiddenItems, itemLabel] };
      savePrefs(next);
      return next;
    });
  }, []);

  const resetPrefs = useCallback(() => {
    const next = { ...DEFAULT_PREFS };
    savePrefs(next);
    setPrefs(next);
  }, []);

  return {
    hiddenItems: new Set(prefs.hiddenItems),
    toggleItem,
    resetPrefs,
  };
}
