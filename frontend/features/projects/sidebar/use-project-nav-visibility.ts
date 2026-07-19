"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_HIDDEN_PROJECT_NAV_IDS,
  isDefaultProjectNavHidden,
  isProjectNavPinned,
} from "./project-nav-config";

const STORAGE_KEY = "project-nav-hidden";

const listeners = new Set<() => void>();
let cache: ReadonlySet<string> = new Set(DEFAULT_HIDDEN_PROJECT_NAV_IDS);
let cacheRaw: string | null | undefined = undefined;

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

function readSnapshot(): ReadonlySet<string> {
  if (typeof window === "undefined") return cache;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;
  cache = parseHiddenIds(raw);
  return cache;
}

function writeHiddenIds(ids: ReadonlySet<string>): void {
  if (typeof window === "undefined") return;
  const next = new Set(
    [...ids].filter((id) => id.length > 0 && !isProjectNavPinned(id)),
  );
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  } catch {
    return;
  }
  cacheRaw = null;
  cache = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      cacheRaw = undefined;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getServerSnapshot(): ReadonlySet<string> {
  return cache;
}

export function useProjectNavVisibility() {
  const hiddenIds = useSyncExternalStore(
    subscribe,
    readSnapshot,
    getServerSnapshot,
  );

  const isVisible = useCallback(
    (id: string) => isProjectNavPinned(id) || !hiddenIds.has(id),
    [hiddenIds],
  );

  const setVisible = useCallback((id: string, visible: boolean) => {
    if (isProjectNavPinned(id)) return;
    const current = readSnapshot();
    const next = new Set(current);
    if (visible) next.delete(id);
    else next.add(id);
    writeHiddenIds(next);
  }, []);

  const reset = useCallback(() => {
    writeHiddenIds(new Set(DEFAULT_HIDDEN_PROJECT_NAV_IDS));
  }, []);

  return {
    hiddenIds,
    isVisible,
    setVisible,
    reset,
    hasCustomizations: !isDefaultProjectNavHidden(hiddenIds),
  };
}
