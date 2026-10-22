"use client";

import * as React from "react";
import { useOutboxContext } from "@/lib/offline/outbox-provider";
import { countEntries } from "@/lib/offline/outbox-types";
import type { DrainReport } from "@/lib/offline/outbox-drain";
import type { OutboxCounts, OutboxEntry } from "@/lib/offline/outbox-types";


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
  isSettled: boolean;
  lastReport: DrainReport | null;
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

export type { OutboxEntry };
