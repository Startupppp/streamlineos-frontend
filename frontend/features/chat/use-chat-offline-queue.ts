"use client";

import { useEffect, useSyncExternalStore, type RefObject } from "react";

function subscribeToConnectivity(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function readOnline(): boolean {
  return navigator.onLine;
}

function assumeOnline(): boolean {
  return true;
}

export function useChatOfflineQueue(
  flushRef: RefObject<() => Promise<void>>,
): { isOnline: boolean } {
  const isOnline = useSyncExternalStore(subscribeToConnectivity, readOnline, assumeOnline);

  useEffect(() => {
    if (isOnline) void flushRef.current();
  }, [isOnline, flushRef]);

  return { isOnline };
}
