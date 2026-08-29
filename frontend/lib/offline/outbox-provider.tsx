"use client";

import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { createOutboxStorage } from "./indexeddb-outbox-storage";
import { startDrainLoop, type DrainLoop, type DrainReport, type OutboxTransport } from "./outbox-drain";
import { OutboxQueue } from "./outbox-queue";
import type { OutboxEntry, SyncBatchResult } from "./outbox-types";

/**
 * B8 — the outbox, mounted.
 *
 * The queue is a module-level singleton rather than provider state. Two
 * instances would each hydrate the same object store, each claim entries and
 * each retry the other's — and React StrictMode mounts every provider twice in
 * development, so "one per provider" would already be two on the first render.
 * One queue per document, and the provider only wires it to the tree.
 */
let sharedQueue: OutboxQueue | null = null;

export function getOutboxQueue(): OutboxQueue {
  return (sharedQueue ??= new OutboxQueue({ storage: createOutboxStorage() }));
}

/**
 * The wire. `operations` goes through untouched — this is the last place the
 * frozen payloads exist before they leave, and rebuilding one here would be a
 * second place an idempotency key could be regenerated.
 *
 * The `Idempotency-Key` header is derived from the operation ids rather than
 * being fresh per attempt, so a resent identical batch is stable at the HTTP
 * layer too. The real duplicate safety is per operation and lives inside the
 * body, where the server reads it; this is belt and braces for the proxy layer
 * in between.
 */
export const outboxTransport: OutboxTransport = {
  send: (operations) =>
    apiClient.post<SyncBatchResult>(
      "/inventory/sync/batch",
      { operations },
      {
        headers: {
          "Idempotency-Key": `outbox:${operations
            .map((operation) => operation.clientOperationId)
            .join(",")}`,
        },
      },
    ),
};

export interface OutboxContextValue {
  entries: readonly OutboxEntry[];
  isOnline: boolean;
  /** What the last pass that actually sent something did. */
  lastReport: DrainReport | null;
  queue: OutboxQueue;
  /** Ask the loop for a pass now; resolves when that pass is done. */
  drainNow: () => Promise<DrainReport>;
}

const OutboxContext = React.createContext<OutboxContextValue | null>(null);

const EMPTY: readonly OutboxEntry[] = [];

export function InventoryOutboxProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const queue = getOutboxQueue();
  const [isOnline, setIsOnline] = React.useState(true);
  const [lastReport, setLastReport] = React.useState<DrainReport | null>(null);

  /**
   * The queue is external state, so it is read through the store protocol
   * rather than mirrored into `useState`. A copy in component state would be a
   * second source of truth for something a background loop mutates, and the two
   * would disagree the moment a drain landed between a render and its effect.
   *
   * The server snapshot is a stable empty array: the queue lives in IndexedDB
   * and does not exist during a server render.
   */
  const entries = React.useSyncExternalStore(
    queue.subscribe,
    queue.getSnapshot,
    () => EMPTY,
  );

  /**
   * A subscription, not a fetch trigger. `online`/`offline` are browser events
   * with no Query equivalent, which is exactly what an effect is for.
   */
  React.useEffect(function subscribeToConnectivity() {
    const sync = (): void => {
      setIsOnline(navigator.onLine);
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  /**
   * The background drain.
   *
   * `loopRef` guards StrictMode's double invoke: mounting two loops would give
   * the device two interval timers and two concurrent passes, each claiming
   * entries the other was about to send. The ref is cleared in cleanup so a
   * genuine remount still gets a loop.
   */
  const loopRef = React.useRef<DrainLoop | null>(null);
  React.useEffect(function runDrainLoop() {
    if (loopRef.current) return;
    const loop = startDrainLoop({
      queue,
      transport: outboxTransport,
      onDrained: (report) => {
        if (report.sent > 0) setLastReport(report);
      },
    });
    loopRef.current = loop;
    return () => {
      loop.stop();
      loopRef.current = null;
    };
  }, [queue]);

  const drainNow = React.useCallback(function requestDrain() {
    return (
      loopRef.current?.request() ??
      Promise.resolve({
        sent: 0,
        applied: 0,
        duplicates: 0,
        conflicts: 0,
        failures: 0,
      })
    );
  }, []);

  const value = React.useMemo<OutboxContextValue>(
    () => ({ entries, isOnline, lastReport, queue, drainNow }),
    [entries, isOnline, lastReport, queue, drainNow],
  );

  return <OutboxContext.Provider value={value}>{children}</OutboxContext.Provider>;
}

/**
 * Read the outbox.
 *
 * Returns `null` outside a provider rather than throwing, so a surface that
 * merely *offers* offline capture — a barcode page, a pick screen — renders
 * normally in a tree that has not mounted one.
 */
export function useOutboxContext(): OutboxContextValue | null {
  return React.useContext(OutboxContext);
}
