"use client";

import type { useAbly } from "ably/react";

type AblyClient = ReturnType<typeof useAbly>;

const CONNECTION_UNAVAILABLE = "Real-time connection unavailable";

const RESYNC_FROM_STATES = ["disconnected", "suspended"];

export interface AblyConnectionSnapshot {
  readonly isConnected: boolean;
  readonly connectionError: string | null;
  readonly reconnectCount: number;
}

interface ConnectionStore {
  snapshot: AblyConnectionSnapshot;
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => AblyConnectionSnapshot;
}

const stores = new WeakMap<AblyClient, ConnectionStore>();

function createStore(ably: AblyClient): ConnectionStore {
  const subscribers = new Set<() => void>();
  let previousState: string = ably.connection.state;
  let attached = false;

  const store: ConnectionStore = {
    snapshot: {
      isConnected: ably.connection.state === "connected",
      connectionError:
        ably.connection.state === "failed" ? CONNECTION_UNAVAILABLE : null,
      reconnectCount: 0,
    },
    subscribe: (onChange: () => void) => {
      subscribers.add(onChange);
      if (!attached) attach();
      return () => {
        subscribers.delete(onChange);
        if (subscribers.size === 0) detach();
      };
    },
    getSnapshot: () => store.snapshot,
  };

  function publish(next: AblyConnectionSnapshot): void {
    const current = store.snapshot;
    if (
      current.isConnected === next.isConnected &&
      current.connectionError === next.connectionError &&
      current.reconnectCount === next.reconnectCount
    )
      return;
    store.snapshot = next;
    for (const onChange of subscribers) onChange();
  }

  function handleConnected(): void {
    const reconnected = RESYNC_FROM_STATES.includes(previousState);
    previousState = "connected";
    publish({
      isConnected: true,
      connectionError: null,
      reconnectCount: store.snapshot.reconnectCount + (reconnected ? 1 : 0),
    });
  }

  function handleDisconnected(): void {
    previousState = ably.connection.state;
    publish({
      isConnected: false,
      connectionError: store.snapshot.connectionError,
      reconnectCount: store.snapshot.reconnectCount,
    });
  }

  function handleFailed(): void {
    previousState = ably.connection.state;
    publish({
      isConnected: false,
      connectionError: CONNECTION_UNAVAILABLE,
      reconnectCount: store.snapshot.reconnectCount,
    });
  }

  function attach(): void {
    attached = true;
    ably.connection.on("connected", handleConnected);
    ably.connection.on("disconnected", handleDisconnected);
    ably.connection.on("failed", handleFailed);
    ably.connection.on("suspended", handleDisconnected);
    previousState = ably.connection.state;
    publish({
      isConnected: ably.connection.state === "connected",
      connectionError:
        ably.connection.state === "failed" ? CONNECTION_UNAVAILABLE : null,
      reconnectCount: store.snapshot.reconnectCount,
    });
  }

  function detach(): void {
    attached = false;
    ably.connection.off("connected", handleConnected);
    ably.connection.off("disconnected", handleDisconnected);
    ably.connection.off("failed", handleFailed);
    ably.connection.off("suspended", handleDisconnected);
  }

  return store;
}

export function ablyConnectionStore(ably: AblyClient): ConnectionStore {
  const existing = stores.get(ably);
  if (existing !== undefined) return existing;
  const created = createStore(ably);
  stores.set(ably, created);
  return created;
}
