"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_HIDDEN_PROJECT_NAV_IDS,
  isDefaultProjectNavHidden,
  isProjectNavPinned,
} from "./project-nav-config";
import { orgScopedStorageKey, useOrgStorageScope } from "@/lib/org-scoped-storage";

const STORAGE_NAME = "project-nav-hidden";

interface ProjectNavStore {
  cache: ReadonlySet<string>;
  cacheRaw: string | null | undefined;
  listeners: Set<() => void>;
}

const stores = new Map<string, ProjectNavStore>();

function getStore(key: string): ProjectNavStore {
  const existing = stores.get(key);
  if (existing) return existing;
  const store: ProjectNavStore = {
    cache: new Set(DEFAULT_HIDDEN_PROJECT_NAV_IDS),
    cacheRaw: undefined,
    listeners: new Set(),
  };
  stores.set(key, store);
  return store;
}

function parseHiddenIds(raw: string | null): Set<string> {
  if (raw === null) return new Set(DEFAULT_HIDDEN_PROJECT_NAV_IDS);
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter(
        (id): id is string =>
          typeof id === "string" && id.length > 0 && !isProjectNavPinned(id),
      ),
    );
  } catch {
    return new Set(DEFAULT_HIDDEN_PROJECT_NAV_IDS);
  }
}

function readSnapshot(key: string, store: ProjectNavStore): ReadonlySet<string> {
  if (typeof window === "undefined") return store.cache;
  const raw = window.localStorage.getItem(key);
  if (raw === store.cacheRaw) return store.cache;
  store.cacheRaw = raw;
  store.cache = parseHiddenIds(raw);
  return store.cache;
}

function writeHiddenIds(
  key: string,
  store: ProjectNavStore,
  ids: ReadonlySet<string>,
): void {
  if (typeof window === "undefined") return;
  const next = new Set(
    [...ids].filter((id) => id.length > 0 && !isProjectNavPinned(id)),
  );
  try {
    window.localStorage.setItem(key, JSON.stringify([...next]));
  } catch {
    return;
  }
  store.cacheRaw = null;
  store.cache = next;
  store.listeners.forEach((listener) => listener());
}

function subscribe(
  key: string,
  store: ProjectNavStore,
  listener: () => void,
): () => void {
  store.listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) {
      store.cacheRaw = undefined;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    store.listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useProjectNavVisibility() {
  const scope = useOrgStorageScope();
  const key = orgScopedStorageKey(STORAGE_NAME, scope);
  const store = getStore(key);

  const snapshot = useCallback(() => readSnapshot(key, store), [key, store]);
  const sub = useCallback(
    (listener: () => void) => subscribe(key, store, listener),
    [key, store],
  );

  const hiddenIds = useSyncExternalStore(sub, snapshot, () => store.cache);

  const isVisible = useCallback(
    (id: string) => isProjectNavPinned(id) || !hiddenIds.has(id),
    [hiddenIds],
  );

  const setVisible = useCallback(
    (id: string, visible: boolean) => {
      if (isProjectNavPinned(id)) return;
      const current = readSnapshot(key, store);
      const next = new Set(current);
      if (visible) next.delete(id);
      else next.add(id);
      writeHiddenIds(key, store, next);
    },
    [key, store],
  );

  const reset = useCallback(() => {
    writeHiddenIds(key, store, new Set(DEFAULT_HIDDEN_PROJECT_NAV_IDS));
  }, [key, store]);

  return {
    hiddenIds,
    isVisible,
    setVisible,
    reset,
    hasCustomizations: !isDefaultProjectNavHidden(hiddenIds),
  };
}
