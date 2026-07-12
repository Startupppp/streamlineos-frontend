"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "streamlineos.calendar.crmEventsVisible";
const listeners = new Set<() => void>();
let cache: boolean = true;
let cacheRaw: string | null = null;

function readSnapshot(): boolean {
  if (typeof window === "undefined") return cache;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;
  cache = raw === null ? true : raw !== "false";
  return cache;
}

function write(visible: boolean) {
  window.localStorage.setItem(STORAGE_KEY, String(visible));
  cacheRaw = null;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCrmEventsVisible() {
  const visible = useSyncExternalStore(subscribe, readSnapshot, () => cache);
  const toggle = useCallback(() => write(!readSnapshot()), []);
  return { visible, toggle };
}
