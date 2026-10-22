"use client";

import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { createOutboxStorage } from "./indexeddb-outbox-storage";
import { startDrainLoop, type DrainLoop, type DrainReport, type OutboxTransport } from "./outbox-drain";
import { OutboxQueue } from "./outbox-queue";
import type { OutboxEntry, SyncBatchResult } from "./outbox-types";
import { lazyContract } from "@/lib/api-envelope";

let sharedQueue: OutboxQueue | null = null;

export function getOutboxQueue(): OutboxQueue {
  return (sharedQueue ??= new OutboxQueue({ storage: createOutboxStorage() }));
}

const syncBatchLazy = lazyContract(() =>
  import("./sync-batch-schema").then((m) => m.syncBatchResultContract),
);

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
      syncBatchLazy,
    ),
};

export interface OutboxContextValue {
  entries: readonly OutboxEntry[];
  isOnline: boolean;
  lastReport: DrainReport | null;
  queue: OutboxQueue;
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

  const entries = React.useSyncExternalStore(
    queue.subscribe,
    queue.getSnapshot,
    () => EMPTY,
  );

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

export function useOutboxContext(): OutboxContextValue | null {
  return React.useContext(OutboxContext);
}
