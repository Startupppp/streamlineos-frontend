"use client";

import { useCallback, useSyncExternalStore } from "react";

interface VisibilityStore {
  cache: boolean;
  cacheRaw: string | null;
  listeners: Set<() => void>;
}

const stores = new Map<string, VisibilityStore>();

function getStore(key: string, defaultVisible: boolean): VisibilityStore {
  const existing = stores.get(key);
  if (existing) return existing;

  const store: VisibilityStore = {
    cache: defaultVisible,
    cacheRaw: null,
    listeners: new Set(),
  };
  stores.set(key, store);
  return store;
}

export function useCalendarSourceVisibility(
  source: string,
  defaultVisible = true,
) {
  const key = `streamlineos.calendar.${source}Visible`;
  const store = getStore(key, defaultVisible);

  const readSnapshot = useCallback(() => {
    if (typeof window === "undefined") return store.cache;
    const raw = window.localStorage.getItem(key);
    if (raw === store.cacheRaw) return store.cache;
    store.cacheRaw = raw;
    store.cache = raw === null ? defaultVisible : raw !== "false";
    return store.cache;
  }, [defaultVisible, key, store]);

  const subscribe = useCallback(
    (listener: () => void) => {
      store.listeners.add(listener);
      return () => store.listeners.delete(listener);
    },
    [store],
  );

  const visible = useSyncExternalStore(
    subscribe,
    readSnapshot,
    () => defaultVisible,
  );

  const toggle = useCallback(() => {
    const next = !readSnapshot();
    window.localStorage.setItem(key, String(next));
    store.cacheRaw = null;
    store.listeners.forEach((listener) => listener());
  }, [key, readSnapshot, store]);

  return { visible, toggle };
}
