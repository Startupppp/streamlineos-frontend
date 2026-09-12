import type { OutboxEntry } from "./outbox-types";

/**
 * B8 — where the queue lives, stated as a port.
 *
 * IndexedDB is the real implementation and the only one that ships, but the
 * queue is written against this interface for a reason that is not purity:
 * jsdom has no IndexedDB, so a queue that reached for `indexedDB` directly
 * could only ever be tested through a mock of the browser, and the properties
 * worth proving here — that a key survives a retry, that nothing is marked
 * synced before an ack, that ordering holds — are properties of the queue, not
 * of the database.
 */
export interface OutboxStorage {
  /** Everything, in no guaranteed order. The queue sorts. */
  all(): Promise<OutboxEntry[]>;
  /**
   * Add an entry that must not already exist. Rejects a duplicate key rather
   * than overwriting: a second enqueue under an existing id means an id was
   * reused, and silently replacing the first entry would lose an operation the
   * operator believes is queued.
   */
  insert(entry: OutboxEntry): Promise<void>;
  /** Overwrite entries that already exist — a status transition, an attempt count. */
  save(entries: readonly OutboxEntry[]): Promise<void>;
  remove(clientOperationIds: readonly string[]): Promise<void>;
}

export class DuplicateOutboxKeyError extends Error {
  constructor(readonly clientOperationId: string) {
    super(
      `An operation is already queued under ${clientOperationId}. An idempotency key is minted once and never reused.`,
    );
    this.name = "DuplicateOutboxKeyError";
  }
}

/**
 * The in-memory store. Used by tests, and by any environment with no IndexedDB
 * — a server render, a private-mode browser that refuses to open a database.
 *
 * Falling back to memory rather than throwing is deliberate: an operator whose
 * browser will not give us a database should still be able to record a count
 * and drain it before they close the tab. Losing the queue on reload is bad;
 * refusing the scan outright is worse, because there is no other way to record
 * it and the goods are on the dock either way.
 */
export function createMemoryOutboxStorage(
  seed: readonly OutboxEntry[] = [],
): OutboxStorage {
  const rows = new Map<string, OutboxEntry>(
    seed.map((entry) => [entry.clientOperationId, entry]),
  );

  return {
    all: () => Promise.resolve([...rows.values()]),
    insert: (entry) => {
      if (rows.has(entry.clientOperationId)) {
        return Promise.reject(
          new DuplicateOutboxKeyError(entry.clientOperationId),
        );
      }
      rows.set(entry.clientOperationId, entry);
      return Promise.resolve();
    },
    save: (entries) => {
      for (const entry of entries) rows.set(entry.clientOperationId, entry);
      return Promise.resolve();
    },
    remove: (ids) => {
      for (const id of ids) rows.delete(id);
      return Promise.resolve();
    },
  };
}
