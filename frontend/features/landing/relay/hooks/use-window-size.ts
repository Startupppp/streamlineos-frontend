
"use client";

import { useSyncExternalStore } from "react";

const DEBOUNCE_MS = 300;

interface WindowSize {
  width: number;
  height: number;
}

const SERVER_SNAPSHOT: WindowSize = { width: 0, height: 0 };

const measure = (): WindowSize => ({
  width: window.innerWidth,
  height: window.innerHeight,
});

let snapshot: WindowSize =
  typeof window !== "undefined" ? measure() : SERVER_SNAPSHOT;

const listeners = new Set<() => void>();
let resizeBound = false;
let debounceId: ReturnType<typeof setTimeout> | undefined;

const publish = (): void => {
  const next = measure();
  if (next.width === snapshot.width && next.height === snapshot.height) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
};

const handleResize = (): void => {
  if (debounceId) clearTimeout(debounceId);
  debounceId = setTimeout(publish, DEBOUNCE_MS);
};

const subscribe = (listener: () => void): (() => void) => {
  if (!resizeBound) {
    snapshot = measure();
    window.addEventListener("resize", handleResize, { passive: true });
    resizeBound = true;
  }
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("resize", handleResize);
      if (debounceId) clearTimeout(debounceId);
      resizeBound = false;
    }
  };
};

function useWindowSize(): WindowSize {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => SERVER_SNAPSHOT,
  );
}

export function useWindowWidth(): number {
  return useSyncExternalStore(
    subscribe,
    () => snapshot.width,
    () => SERVER_SNAPSHOT.width,
  );
}

function useWindowHeight(): number {
  return useSyncExternalStore(
    subscribe,
    () => snapshot.height,
    () => SERVER_SNAPSHOT.height,
  );
}
