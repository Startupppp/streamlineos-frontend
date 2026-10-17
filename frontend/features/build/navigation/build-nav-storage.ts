"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  orgScopedStorageKey,
  useOrgStorageScope,
} from "@/lib/org-scoped-storage";
import type { BuildScopeType } from "@/lib/build/build-scope";

export interface BuildScopeRef {
  key: string;
  type: BuildScopeType;
  id: string;
  name: string;
  parentPath: string | null;
  parentKey: string | null;
  projectKey: string | null;
  href: string;
}

interface JsonStore {
  raw: string | null | undefined;
  value: unknown;
  listeners: Set<() => void>;
}

const stores = new Map<string, JsonStore>();

function getStore(storageKey: string, fallback: unknown): JsonStore {
  const existing = stores.get(storageKey);
  if (existing) return existing;
  const store: JsonStore = {
    raw: undefined,
    value: fallback,
    listeners: new Set(),
  };
  stores.set(storageKey, store);
  return store;
}

function readStore<TValue>(
  storageKey: string,
  store: JsonStore,
  parse: (raw: unknown) => TValue,
  fallback: TValue,
): TValue {
  if (typeof window === "undefined") return fallback;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(storageKey);
  } catch {
    return fallback;
  }
  if (raw === store.raw) return parse(store.value);
  store.raw = raw;
  if (raw === null) {
    store.value = fallback;
    return fallback;
  }
  try {
    const value = parse(JSON.parse(raw));
    store.value = value;
    return value;
  } catch {
    store.value = fallback;
    return fallback;
  }
}

function writeStore<TValue>(
  storageKey: string,
  store: JsonStore,
  next: TValue,
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

function subscribeStore(
  storageKey: string,
  store: JsonStore,
  listener: () => void,
): () => void {
  store.listeners.add(listener);
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== storageKey && event.key !== null) return;
    store.raw = undefined;
    listener();
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    store.listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useStoredJson<TValue>(
  storageName: string,
  parse: (raw: unknown) => TValue,
  fallback: TValue,
): { value: TValue; write: (next: TValue) => void } {
  const scope = useOrgStorageScope();
  const storageKey = orgScopedStorageKey(storageName, scope);
  const store = getStore(storageKey, fallback);

  const getSnapshot = useCallback(
    () => readStore(storageKey, store, parse, fallback),
    [storageKey, store, parse, fallback],
  );
  const getServerSnapshot = useCallback(() => fallback, [fallback]);
  const subscribe = useCallback(
    (listener: () => void) => subscribeStore(storageKey, store, listener),
    [storageKey, store],
  );

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const write = useCallback(
    (next: TValue) => writeStore(storageKey, store, next),
    [storageKey, store],
  );

  return { value, write };
}

export function parseBoolean(raw: unknown): boolean {
  return raw === true;
}

export function parseIds(raw: unknown): readonly string[] {
  const EMPTY: readonly string[] = [];
  if (!Array.isArray(raw)) return EMPTY;
  if (raw.every((entry): entry is string => typeof entry === "string" && entry.length > 0)) {
    return raw;
  }
  return raw.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function parseScopeRef(entry: unknown): BuildScopeRef | null {
  if (typeof entry !== "object" || entry === null) return null;
  if (!("key" in entry) || typeof entry.key !== "string") return null;
  if (!("type" in entry) || (entry.type !== "product" && entry.type !== "project")) return null;
  if (!("id" in entry) || typeof entry.id !== "string") return null;
  if (!("name" in entry) || typeof entry.name !== "string") return null;
  if (!("href" in entry) || typeof entry.href !== "string") return null;
  return {
    key: entry.key,
    type: entry.type,
    id: entry.id,
    name: entry.name,
    parentPath:
      "parentPath" in entry && typeof entry.parentPath === "string"
        ? entry.parentPath
        : null,
    parentKey:
      "parentKey" in entry && typeof entry.parentKey === "string"
        ? entry.parentKey
        : null,
    projectKey:
      "projectKey" in entry && typeof entry.projectKey === "string"
        ? entry.projectKey
        : null,
    href: entry.href,
  };
}

function isScopeRef(entry: unknown): entry is BuildScopeRef {
  if (typeof entry !== "object" || entry === null) return false;
  return (
    "key" in entry &&
    typeof entry.key === "string" &&
    "type" in entry &&
    (entry.type === "product" || entry.type === "project") &&
    "id" in entry &&
    typeof entry.id === "string" &&
    "name" in entry &&
    typeof entry.name === "string" &&
    "parentPath" in entry &&
    (typeof entry.parentPath === "string" || entry.parentPath === null) &&
    "parentKey" in entry &&
    (typeof entry.parentKey === "string" || entry.parentKey === null) &&
    "projectKey" in entry &&
    (typeof entry.projectKey === "string" || entry.projectKey === null) &&
    "href" in entry &&
    typeof entry.href === "string"
  );
}

export function parseScopeRefs(raw: unknown): readonly BuildScopeRef[] {
  const EMPTY: readonly BuildScopeRef[] = [];
  if (!Array.isArray(raw)) return EMPTY;
  if (raw.every(isScopeRef)) return raw;
  return raw.flatMap((entry) => {
    const scope = parseScopeRef(entry);
    return scope === null ? [] : [scope];
  });
}
