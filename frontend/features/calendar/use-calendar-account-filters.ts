"use client";

import { useCallback, useSyncExternalStore } from "react";
import { orgScopedStorageKey, useOrgStorageScope } from "@/lib/org-scoped-storage";

const STORAGE_NAME = "streamlineos.calendar.hiddenConnectionIds";

interface AccountFilterStore {
  cache: readonly number[];
  cacheRaw: string | null;
  listeners: Set<() => void>;
}

const stores = new Map<string, AccountFilterStore>();

function getStore(key: string): AccountFilterStore {
  const existing = stores.get(key);
  if (existing) return existing;
  const store: AccountFilterStore = { cache: [], cacheRaw: null, listeners: new Set() };
  stores.set(key, store);
  return store;
}

function readSnapshot(key: string, store: AccountFilterStore): readonly number[] {
  if (typeof window === "undefined") return store.cache;
  const raw = window.localStorage.getItem(key);
  if (raw === store.cacheRaw) return store.cache;
  store.cacheRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    store.cache = Array.isArray(parsed)
      ? parsed.filter((v): v is number => typeof v === "number")
      : [];
  } catch {
    store.cache = [];
  }
  return store.cache;
}

function write(key: string, store: AccountFilterStore, ids: readonly number[]): void {
  window.localStorage.setItem(key, JSON.stringify(ids));
  store.cacheRaw = null;
  store.listeners.forEach((l) => l());
}

function subscribe(
  key: string,
  store: AccountFilterStore,
  listener: () => void,
): () => void {
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
}

export function useCalendarAccountFilters() {
  const scope = useOrgStorageScope();
  const key = orgScopedStorageKey(STORAGE_NAME, scope);
  const store = getStore(key);

  const snapshot = useCallback(() => readSnapshot(key, store), [key, store]);
  const sub = useCallback(
    (listener: () => void) => subscribe(key, store, listener),
    [key, store],
  );

  const hiddenIds = useSyncExternalStore(sub, snapshot, () => store.cache);

  const toggleConnection = useCallback(
    (connectionId: number) => {
      const current = readSnapshot(key, store);
      write(
        key,
        store,
        current.includes(connectionId)
          ? current.filter((id) => id !== connectionId)
          : [...current, connectionId],
      );
    },
    [key, store],
  );

  const showAll = useCallback(() => write(key, store, []), [key, store]);

  return { hiddenIds, toggleConnection, showAll };
}
