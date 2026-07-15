"use client";

import { useSyncExternalStore, useCallback, useMemo } from "react";
import {
  DEFAULT_VISIBLE_NAV_IDS,
  MAX_VISIBLE_NAV_ITEMS,
  buildNavCatalog,
  partitionProjectNav,
  type ProjectNavGroup,
  type ProjectNavItem,
  type ProjectNavPermissions,
} from "./project-nav-config";

const STORAGE_KEY = "project-sidebar-visible-nav";

const SERVER_SNAPSHOT: string[] = [...DEFAULT_VISIBLE_NAV_IDS];

function parseVisibleIds(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const ids = parsed.filter((value): value is string => typeof value === "string");
    return ids.length > 0 ? ids : null;
  } catch {
    return null;
  }
}

function readStoredVisibleIds(): string[] {
  if (typeof window === "undefined") {
    return SERVER_SNAPSHOT;
  }
  return parseVisibleIds(localStorage.getItem(STORAGE_KEY)) ?? [
    ...DEFAULT_VISIBLE_NAV_IDS,
  ];
}

let cachedSnapshot = typeof window === "undefined" ? SERVER_SNAPSHOT : readStoredVisibleIds();
const listeners = new Set<() => void>();

function emitChange() {
  cachedSnapshot = readStoredVisibleIds();
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY || event.key === null) {
      emitChange();
    }
  }
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function getSnapshot(): string[] {
  return cachedSnapshot;
}

function getServerSnapshot(): string[] {
  return SERVER_SNAPSHOT;
}

function writeVisibleIds(ids: string[]) {
  const next = ids.slice(0, MAX_VISIBLE_NAV_ITEMS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  emitChange();
}

export function useProjectNavVisibility(
  baseUrl: string,
  perms: ProjectNavPermissions,
): {
  catalog: ProjectNavGroup[];
  primary: ProjectNavItem[];
  moreGroups: ProjectNavGroup[];
  visibleIds: string[];
  setVisibleIds: (ids: string[]) => void;
  resetToDefault: () => void;
  isDefault: boolean;
} {
  const visibleIds = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const catalog = useMemo(
    () => buildNavCatalog(baseUrl, perms),
    [baseUrl, perms],
  );

  const { primary, moreGroups } = useMemo(
    () => partitionProjectNav(catalog, visibleIds),
    [catalog, visibleIds],
  );

  const setVisibleIds = useCallback((ids: string[]) => {
    writeVisibleIds(ids);
  }, []);

  const resetToDefault = useCallback(() => {
    writeVisibleIds([...DEFAULT_VISIBLE_NAV_IDS]);
  }, []);

  const isDefault = useMemo(() => {
    if (visibleIds.length !== DEFAULT_VISIBLE_NAV_IDS.length) return false;
    return DEFAULT_VISIBLE_NAV_IDS.every((id, index) => visibleIds[index] === id);
  }, [visibleIds]);

  return {
    catalog,
    primary,
    moreGroups,
    visibleIds,
    setVisibleIds,
    resetToDefault,
    isDefault,
  };
}
