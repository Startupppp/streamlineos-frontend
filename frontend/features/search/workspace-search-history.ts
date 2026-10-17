"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  orgScopedStorageKey,
  useOrgStorageScope,
} from "@/lib/org-scoped-storage";

const WORKSPACE_SEARCH_HISTORY_LIMIT = 8;

const HISTORY_NAME = "build-search-history";
const EMPTY_HISTORY: readonly string[] = [];

interface HistoryStore {
  raw: string | null | undefined;
  value: readonly string[];
  listeners: Set<() => void>;
}

const stores = new Map<string, HistoryStore>();

export function parseSearchHistory(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is string => typeof entry === "string")
      .slice(0, WORKSPACE_SEARCH_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function addSearchHistory(history: string[], query: string): string[] {
  const normalized = query.trim();
  if (normalized.length < 2) return history;
  return [
    normalized,
    ...history.filter(
      (entry) => entry.toLocaleLowerCase() !== normalized.toLocaleLowerCase(),
    ),
  ].slice(0, WORKSPACE_SEARCH_HISTORY_LIMIT);
}

function getStore(storageKey: string): HistoryStore {
  const existing = stores.get(storageKey);
  if (existing) return existing;
  const store: HistoryStore = {
    raw: undefined,
    value: EMPTY_HISTORY,
    listeners: new Set(),
  };
  stores.set(storageKey, store);
  return store;
}

function readHistory(
  storageKey: string,
  store: HistoryStore,
): readonly string[] {
  if (typeof window === "undefined") return EMPTY_HISTORY;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(storageKey);
  } catch {
    return EMPTY_HISTORY;
  }
  if (raw === store.raw) return store.value;
  store.raw = raw;
  store.value = parseSearchHistory(raw);
  return store.value;
}

function publishHistory(
  storageKey: string,
  store: HistoryStore,
  next: readonly string[],
): void {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(next);
  try {
    window.localStorage.setItem(storageKey, serialized);
  } catch {
    return;
  }
  store.raw = serialized;
  store.value = next;
  store.listeners.forEach((listener) => listener());
}

function subscribeHistory(
  storageKey: string,
  store: HistoryStore,
  listener: () => void,
): () => void {
  store.listeners.add(listener);
  function handleStorage(event: StorageEvent) {
    if (event.key !== storageKey && event.key !== null) return;
    store.raw = undefined;
    listener();
  }
  window.addEventListener("storage", handleStorage);
  return () => {
    store.listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useWorkspaceSearchHistory(): {
  history: readonly string[];
  remember: (query: string) => void;
  clear: () => void;
} {
  const scope = useOrgStorageScope();
  const storageKey = orgScopedStorageKey(HISTORY_NAME, scope);
  const store = getStore(storageKey);
  const getSnapshot = useCallback(
    () => readHistory(storageKey, store),
    [storageKey, store],
  );
  const subscribe = useCallback(
    (listener: () => void) => subscribeHistory(storageKey, store, listener),
    [storageKey, store],
  );
  const history = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => EMPTY_HISTORY,
  );
  const remember = useCallback(
    (query: string) => {
      const next = addSearchHistory([...readHistory(storageKey, store)], query);
      publishHistory(storageKey, store, next);
    },
    [storageKey, store],
  );
  const clear = useCallback(
    () => publishHistory(storageKey, store, EMPTY_HISTORY),
    [storageKey, store],
  );

  return { history, remember, clear };
}
