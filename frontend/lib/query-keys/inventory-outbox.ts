import { queryKeyBase as base } from "./base";

/**
 * B8 — the device outbox.
 *
 * A namespace of its own rather than three more entries on
 * `inventoryQueryKeys`, because that object is under concurrent edit and this
 * is additive: two files, no shared line. The registry merges the domain
 * objects with a **shallow** spread, so a second file that also declared an
 * `inventory` key would replace the first wholesale rather than merge with it —
 * which is why this reads `queryKeys.inventoryOutbox.*`.
 *
 * The queue itself is not Query state. It lives in IndexedDB and is read
 * through `useSyncExternalStore`, because a queue whose contents depend on a
 * cache that can be garbage-collected is a queue that loses work. What is here
 * is the mutation key for a manual drain, and the list of caches a successful
 * drain has to invalidate — a replayed batch has moved stock, and every surface
 * showing a level or a pick line is now stale.
 */
export const inventoryOutboxQueryKeys = {
  inventoryOutbox: {
    all: [...base, "inventoryOutbox"] as const,
    /** The manual "sync now" the operator can press. */
    drain: [...base, "inventoryOutbox", "drain"] as const,
    /** Retrying or discarding one conflicted entry. */
    resolve: [...base, "inventoryOutbox", "resolve"] as const,
    /** Dropping the acknowledged tail once the operator has seen it. */
    clearSynced: [...base, "inventoryOutbox", "clearSynced"] as const,
  },
} as const;
