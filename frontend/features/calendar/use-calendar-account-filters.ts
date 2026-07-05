"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "streamlineos.calendar.hiddenConnectionIds";
const listeners = new Set<() => void>();
let cache: readonly number[] = [];
let cacheRaw: string | null = null;

function readSnapshot(): readonly number[] {
  if (typeof window === "undefined") return cache;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter((v): v is number => typeof v === "number") : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(ids: readonly number[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  cacheRaw = null;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCalendarAccountFilters() {
  const hiddenIds = useSyncExternalStore(subscribe, readSnapshot, () => cache);

  const toggleConnection = useCallback((connectionId: number) => {
    const current = readSnapshot();
    write(
      current.includes(connectionId)
        ? current.filter((id) => id !== connectionId)
        : [...current, connectionId],
    );
  }, []);

  const showAll = useCallback(() => write([]), []);

  return { hiddenIds, toggleConnection, showAll };
}
