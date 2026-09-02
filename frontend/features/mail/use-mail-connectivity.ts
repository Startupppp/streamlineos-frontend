"use client";

import { useCallback, useSyncExternalStore } from "react";
import { onlineManager } from "@tanstack/react-query";

function getSnapshot(): boolean {
  return onlineManager.isOnline();
}

function getServerSnapshot(): boolean {
  return true;
}

export function useMailConnectivity(): { isOnline: boolean } {
  const subscribe = useCallback(
    (onStoreChange: () => void) => onlineManager.subscribe(onStoreChange),
    [],
  );
  const isOnline = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return { isOnline };
}
