"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { orgScopedStorageKey, useOrgStorageScope } from "@/lib/org-scoped-storage";
import { calendarUrl } from "./calendar-url-state";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const scope = useOrgStorageScope();
  const key = orgScopedStorageKey(STORAGE_NAME, scope);
  const store = getStore(key);

  const snapshot = useCallback(() => readSnapshot(key, store), [key, store]);
  const sub = useCallback(
    (listener: () => void) => subscribe(key, store, listener),
    [key, store],
  );

  const storedIds = useSyncExternalStore(sub, snapshot, () => store.cache);
  const hiddenParam = searchParams.get("hiddenAccounts");
  const hiddenIds = hiddenParam === null
    ? storedIds
    : [...new Set(hiddenParam
        .split(",")
        .filter((value) => /^[1-9]\d{0,9}$/.test(value))
        .map(Number)
        .filter((value) => Number.isSafeInteger(value) && value <= 2_147_483_647))]
        .slice(0, 100);

  const toggleConnection = useCallback(
    (connectionId: number) => {
      const next = hiddenIds.includes(connectionId)
        ? hiddenIds.filter((id) => id !== connectionId)
        : [...hiddenIds, connectionId];
      write(key, store, next);
      router.push(calendarUrl(
        new URLSearchParams(searchParams.toString()),
        { hiddenAccounts: next.length > 0 ? next.join(",") : null },
      ));
    },
    [hiddenIds, key, router, searchParams, store],
  );

  const showAll = useCallback(() => {
    write(key, store, []);
    router.push(calendarUrl(
      new URLSearchParams(searchParams.toString()),
      { hiddenAccounts: null },
    ));
  }, [key, router, searchParams, store]);

  return { hiddenIds, toggleConnection, showAll };
}
