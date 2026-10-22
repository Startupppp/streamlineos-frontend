import type { OutboxEntry } from "./outbox-types";

export interface OutboxStorage {
  all(): Promise<OutboxEntry[]>;
  insert(entry: OutboxEntry): Promise<void>;
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
