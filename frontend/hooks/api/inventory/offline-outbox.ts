"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useOutboxContext } from "@/lib/offline/outbox-provider";
import { countEntries } from "@/lib/offline/outbox-types";
import type { DrainReport } from "@/lib/offline/outbox-drain";
import type {
  OutboxCounts,
  OutboxEntry,
  OutboxOperationDraft,
  OutboxOperationType,
} from "@/lib/offline/outbox-types";

/**
 * B8 — the outbox, as the UI reads it.
 *
 * Deliberately not `useQuery`. The queue is not server state: it is the record
 * of work the server has *not* seen yet, it lives in IndexedDB, and a cache
 * TanStack is free to garbage-collect is the wrong home for the only copy of an
 * operator's count. Query's job here is the two things it is good at — a
 * `mutationKey` for the manual drain, and invalidating every surface a replayed
 * batch has just made stale.
 */

const EMPTY_ENTRIES: readonly OutboxEntry[] = [];
const EMPTY_COUNTS: OutboxCounts = {
  queued: 0,
  inFlight: 0,
  conflict: 0,
  synced: 0,
};

export interface InventoryOutbox {
  entries: readonly OutboxEntry[];
  counts: OutboxCounts;
  isOnline: boolean;
  /** True when nothing is waiting and nothing is in conflict. */
  isSettled: boolean;
  lastReport: DrainReport | null;
  /** False outside an `InventoryOutboxProvider` — nothing can be queued. */
  isAvailable: boolean;
}

export function useInventoryOutbox(): InventoryOutbox {
  const context = useOutboxContext();
  const entries = context?.entries ?? EMPTY_ENTRIES;

  const counts = React.useMemo(
    () => (context ? countEntries(entries) : EMPTY_COUNTS),
    [context, entries],
  );

  return {
    entries,
    counts,
    isOnline: context?.isOnline ?? true,
    isSettled: counts.queued + counts.inFlight + counts.conflict === 0,
    lastReport: context?.lastReport ?? null,
    isAvailable: context !== null,
  };
}

/**
 * Record an operation for later.
 *
 * The returned callback mints the idempotency key — once, here, at the moment
 * the operator acts. Callers get the entry back so they can show "queued" with
 * the id it will be replayed under; nothing about that id ever changes again.
 */
export function useEnqueueOfflineOperation(): (
  draft: OutboxOperationDraft,
  options?: { label?: string },
) => Promise<OutboxEntry> {
  const context = useOutboxContext();
  const drainNow = context?.drainNow;
  const queue = context?.queue;

  return React.useCallback(
    async function enqueueOperation(
      draft: OutboxOperationDraft,
      options: { label?: string } = {},
    ) {
      if (!queue) {
        throw new Error(
          "Offline capture is not available on this screen. Reload and try again.",
        );
      }
      const entry = await queue.enqueue(draft, options);
      // A queue change is a legitimate reason to ask for a pass: if the device
      // is online this lands immediately and the operator never sees a badge.
      void drainNow?.();
      return entry;
    },
    [queue, drainNow],
  );
}

/**
 * Every surface a replayed batch has just invalidated.
 *
 * A drain that applied anything has moved stock, closed pick lines and possibly
 * posted a receipt, so leaving these caches alone would show the operator the
 * position their queue was built against — the one thing an offline device is
 * guaranteed to be wrong about.
 */
function invalidateAfterDrain(
  queryClient: ReturnType<typeof useQueryClient>,
): void {
  const keys = [
    queryKeys.inventory.stockLevelsList,
    queryKeys.inventory.stockTransactionsList,
    queryKeys.inventory.adjustmentsList,
    queryKeys.inventory.purchaseOrdersList,
    queryKeys.inventory.goodsReceiptsList,
    queryKeys.picking.wavesList,
  ];
  for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
}

/**
 * The operator's "sync now".
 *
 * Gated on the endpoint's own key so a role that cannot replay never fires the
 * request — the batch route is `inventory:stock:adjust`, and the per-operation
 * permissions the server also checks are a separate, stricter gate it enforces
 * itself.
 */
export function useDrainOutbox() {
  const context = useOutboxContext();
  const queryClient = useQueryClient();
  const canReplay = useCan("inventory:stock:adjust");

  return useMutation<DrainReport, Error, void>({
    mutationKey: queryKeys.inventoryOutbox.drain,
    mutationFn: async () => {
      if (!context) {
        throw new Error("The offline queue is not available on this screen.");
      }
      if (!canReplay) {
        throw new Error("You don't have permission to sync queued operations.");
      }
      return context.drainNow();
    },
    onSuccess: (report) => {
      if (report.applied > 0 || report.duplicates > 0) {
        invalidateAfterDrain(queryClient);
      }
    },
  });
}

export type OutboxResolution =
  | { action: "retry"; clientOperationIds: readonly string[] }
  | { action: "discard"; clientOperationIds: readonly string[] };

/**
 * What a human does about a conflict.
 *
 * `retry` keeps the id, so a replay of something that did land after all is a
 * duplicate and moves nothing. `discard` is the only way an operation leaves
 * the queue unsent, and it is always a person's decision — never the drain's.
 */
export function useResolveOutboxConflict() {
  const context = useOutboxContext();

  return useMutation<void, Error, OutboxResolution>({
    mutationKey: queryKeys.inventoryOutbox.resolve,
    mutationFn: async ({ action, clientOperationIds }) => {
      if (!context) {
        throw new Error("The offline queue is not available on this screen.");
      }
      if (action === "retry") {
        await context.queue.retry(clientOperationIds);
        void context.drainNow();
        return;
      }
      await context.queue.discard(clientOperationIds);
    },
  });
}

/** Drop the acknowledged tail once the operator has seen it. */
export function useClearSyncedOutbox() {
  const context = useOutboxContext();

  return useMutation<void, Error, void>({
    mutationKey: queryKeys.inventoryOutbox.clearSynced,
    mutationFn: async () => {
      if (!context) return;
      await context.queue.clearSynced();
    },
  });
}

export type { OutboxEntry, OutboxOperationType, OutboxOperationDraft };
