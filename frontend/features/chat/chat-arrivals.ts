"use client";

import { useCallback, useSyncExternalStore } from "react";

const arrivals = new Map<number, number>();
const listeners = new Set<() => void>();

export function recordChatArrival(channelId: number): void {
  arrivals.set(channelId, Date.now());
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function serverSnapshot(): number {
  return 0;
}

export function useChatArrivalAt(channelId: number): number {
  const snapshot = useCallback(() => arrivals.get(channelId) ?? 0, [channelId]);
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
