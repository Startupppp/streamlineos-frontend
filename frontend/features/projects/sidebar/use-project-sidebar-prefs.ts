"use client";

import { useCallback, useEffect, useState } from "react";

const PREFS_KEY_PREFIX = "streamlineos:project-sidebar:prefs:v1";

function buildKey(userId: string): string {
  return `${PREFS_KEY_PREFIX}:${userId}`;
}

export interface ProjectSidebarPrefs {
  hiddenItems: string[];
}

const DEFAULT_PREFS: ProjectSidebarPrefs = {
  hiddenItems: [],
};

function loadPrefs(userId: string): ProjectSidebarPrefs {
  try {
    const raw = localStorage.getItem(buildKey(userId));
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      hiddenItems: Array.isArray(parsed.hiddenItems)
        ? parsed.hiddenItems.filter((v): v is string => typeof v === "string")
        : [],
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function savePrefs(userId: string, prefs: ProjectSidebarPrefs): void {
  try {
    localStorage.setItem(buildKey(userId), JSON.stringify(prefs));
  } catch {}
}

export function useProjectSidebarPrefs(userId: string | undefined): {
  hiddenItems: ReadonlySet<string>;
  toggleItem: (itemLabel: string) => void;
  resetPrefs: () => void;
} {
  const [prefs, setPrefs] = useState<ProjectSidebarPrefs>(() => {
    if (typeof window === "undefined" || !userId) return { ...DEFAULT_PREFS };
    return loadPrefs(userId);
  });

  useEffect(() => {
    if (!userId) return;
    setPrefs(loadPrefs(userId));
  }, [userId]);

  const toggleItem = useCallback(
    (itemLabel: string) => {
      if (!userId) return;
      setPrefs((prev) => {
        const next: ProjectSidebarPrefs = prev.hiddenItems.includes(itemLabel)
          ? { ...prev, hiddenItems: prev.hiddenItems.filter((l) => l !== itemLabel) }
          : { ...prev, hiddenItems: [...prev.hiddenItems, itemLabel] };
        savePrefs(userId, next);
        return next;
      });
    },
    [userId],
  );

  const resetPrefs = useCallback(() => {
    if (!userId) return;
    const next = { ...DEFAULT_PREFS };
    savePrefs(userId, next);
    setPrefs(next);
  }, [userId]);

  return {
    hiddenItems: new Set(prefs.hiddenItems),
    toggleItem,
    resetPrefs,
  };
}
