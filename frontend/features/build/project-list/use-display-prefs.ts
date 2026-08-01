"use client";

import { useCallback, useState } from "react";

export type ProjectGroupBy = "none" | "status" | "lead";

export type ProjectOrderBy = "name" | "status" | "targetDate" | "progress" | "createdAt";

export type ProjectSortDir = "asc" | "desc";

export interface DisplayPrefs {
  showSummary: boolean;
  showStatus: boolean;
  showPriority: boolean;
  showHealth: boolean;
  showLead: boolean;
  showMembers: boolean;
  showTeams: boolean;
  showTargetDate: boolean;
  showStartDate: boolean;
  showProgress: boolean;
  showIssueCount: boolean;
  showClosed: boolean;
  groupBy: ProjectGroupBy;
  orderBy: ProjectOrderBy;
  orderDir: ProjectSortDir;
}

const STORAGE_KEY = "pm:project-list-display-prefs";

const DEFAULTS: DisplayPrefs = {
  showSummary: false,
  showStatus: true,
  showPriority: true,
  showHealth: false,
  showLead: true,
  showMembers: false,
  showTeams: false,
  showTargetDate: true,
  showStartDate: false,
  showProgress: true,
  showIssueCount: true,
  showClosed: false,
  groupBy: "none",
  orderBy: "name",
  orderDir: "asc",
};

function readPrefs(): DisplayPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<DisplayPrefs>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export function useDisplayPrefs() {
  const [prefs, setPrefsState] = useState<DisplayPrefs>(() => readPrefs());

  const setPrefs = useCallback((next: Partial<DisplayPrefs>) => {
    setPrefsState((prev) => {
      const updated = { ...prev, ...next };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
      }
      return updated;
    });
  }, []);

  const toggle = useCallback(
    (key: keyof DisplayPrefs) => {
      setPrefsState((prev) => {
        const val = prev[key];
        if (typeof val !== "boolean") return prev;
        const updated = { ...prev, [key]: !val };
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
        }
        return updated;
      });
    },
    [],
  );

  return { prefs, setPrefs, toggle };
}
