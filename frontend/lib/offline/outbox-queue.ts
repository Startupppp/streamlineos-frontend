import { getErrorMessage } from "@/lib/get-error-message";
import { createMemoryOutboxStorage, type OutboxStorage } from "./outbox-storage";
import {
  countEntries,
  type OutboxConflict,
  type OutboxConflictKind,
  type OutboxCounts,
  type OutboxEntry,
  type OutboxOperation,
  type OutboxOperationDraft,
  type SyncOperationResult,
} from "./outbox-types";


export const OUTBOX_BATCH_SIZE = 50;

export const OUTBOX_MAX_ATTEMPTS = 8;

const BACKOFF_BASE_MS = 2_000;
const BACKOFF_CEILING_MS = 5 * 60_000;

export function backoffDelayMs(attempts: number, random: () => number): number {
  const ceiling = Math.min(
    BACKOFF_CEILING_MS,
    BACKOFF_BASE_MS * 2 ** Math.max(0, attempts - 1),
  );
  return Math.round(ceiling * random());
}

const STALE_CODES: ReadonlySet<string> = new Set([
  "INVALID_DOCUMENT_STATE",
  "LOT_EXPIRED",
  "SERIAL_ALREADY_USED",
  "QUALITY_HOLD",
  "PRODUCT_NOT_FOUND",
  "LOCATION_NOT_FOUND",
  "WAREHOUSE_NOT_FOUND",
  "STOCK_RESERVED",
]);

const INSUFFICIENT_CODES: ReadonlySet<string> = new Set([
  "INSUFFICIENT_STOCK",
  "HOLD_EXCEEDS_ON_HAND",
  "RELEASE_EXCEEDS_HELD",
  "LOCATION_CAPACITY_EXCEEDED",
]);

const IN_FLIGHT_CODE = "DUPLICATE_IDEMPOTENCY_KEY";

export function classifyConflict(code: string | undefined): OutboxConflictKind {
  if (code && INSUFFICIENT_CODES.has(code)) return "insufficient";
  if (code && STALE_CODES.has(code)) return "stale";
  return "rejected";
}

export interface OutboxQueueOptions {
  storage?: OutboxStorage;
  now?: () => number;
  random?: () => number;
  newOperationId?: () => string;
  maxAttempts?: number;
}

function defaultOperationId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function attachIdentity(
  draft: OutboxOperationDraft,
  clientOperationId: string,
  occurredAt: string,
): OutboxOperation {
  switch (draft.type) {
    case "stock.adjust": return { ...draft, clientOperationId, occurredAt };
    case "pick.confirm": return { ...draft, clientOperationId, occurredAt };
    case "receive.count": return { ...draft, clientOperationId, occurredAt };
    case "scan.capture": return { ...draft, clientOperationId, occurredAt };
  }
}

function byOperatorOrder(a: OutboxEntry, b: OutboxEntry): number {
  const at = Date.parse(a.operation.occurredAt);
  const bt = Date.parse(b.operation.occurredAt);
  if (at !== bt) return at - bt;
  return a.clientOperationId.localeCompare(b.clientOperationId);
}

export class OutboxQueue {
  private readonly storage: OutboxStorage;
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly newOperationId: () => string;
  private readonly maxAttempts: number;

  private rows = new Map<string, OutboxEntry>();
  private cached: readonly OutboxEntry[] = [];
  private readonly listeners = new Set<() => void>();
  private hydrated: Promise<void> | null = null;
  private storageFailed = false;

  constructor(options: OutboxQueueOptions = {}) {
    this.storage = options.storage ?? createMemoryOutboxStorage();
    this.now = options.now ?? (() => Date.now());
    this.random = options.random ?? (() => Math.random());
    this.newOperationId = options.newOperationId ?? defaultOperationId;
    this.maxAttempts = options.maxAttempts ?? OUTBOX_MAX_ATTEMPTS;
  }

  hydrate(): Promise<void> {
    return (this.hydrated ??= this.loadOnce());
  }

  private async loadOnce(): Promise<void> {
    let stored: OutboxEntry[] = [];
    try {
      stored = await this.storage.all();
    } catch {
      this.storageFailed = true;
    }

    const reclaimed = stored
      .filter((entry) => entry.status === "in-flight")
      .map((entry) => ({ ...entry, status: "queued" as const, nextAttemptAt: 0 }));
    const revived = [
      ...stored.filter((entry) => entry.status !== "in-flight"),
      ...reclaimed,
    ];

    this.rows = new Map(revived.map((entry) => [entry.clientOperationId, entry]));
    this.publish();
    if (reclaimed.length > 0) await this.persist(reclaimed);
  }

  get storageAvailable(): boolean {
    return !this.storageFailed;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): readonly OutboxEntry[] => this.cached;

  counts(): OutboxCounts {
    return countEntries(this.cached);
  }

  async enqueue(
    draft: OutboxOperationDraft,
    options: { label?: string } = {},
  ): Promise<OutboxEntry> {
    await this.hydrate();
    const at = this.now();
    const clientOperationId = this.newOperationId();
    const operation = attachIdentity(draft, clientOperationId, new Date(at).toISOString());

    const entry: OutboxEntry = {
      clientOperationId: operation.clientOperationId,
      type: operation.type,
      operation,
      label: options.label,
      enqueuedAt: at,
      attempts: 0,
      status: "queued",
      nextAttemptAt: 0,
    };

    this.rows.set(entry.clientOperationId, entry);
    this.publish();
    try {
      await this.storage.insert(entry);
    } catch (error) {
      this.storageFailed = true;
      void error;
    }
    return entry;
  }

  dueEntries(limit = OUTBOX_BATCH_SIZE): readonly OutboxEntry[] {
    const at = this.now();
    return this.cached
      .filter((entry) => entry.status === "queued" && entry.nextAttemptAt <= at)
      .sort(byOperatorOrder)
      .slice(0, limit);
  }

  async markInFlight(ids: readonly string[]): Promise<void> {
    await this.patch(ids, (entry) => ({
      ...entry,
      status: "in-flight",
      attempts: entry.attempts + 1,
    }));
  }

  async applyResults(results: readonly SyncOperationResult[]): Promise<void> {
    const at = this.now();
    const byId = new Map(results.map((r) => [r.clientOperationId, r]));
    const next: OutboxEntry[] = [];

    for (const entry of this.cached) {
      const result = byId.get(entry.clientOperationId);
      if (!result || entry.status !== "in-flight") continue;

      if (result.outcome === "applied" || result.outcome === "duplicate") {
        next.push({ ...entry, status: "synced", syncedAt: at, conflict: undefined });
        continue;
      }

      if (result.code === IN_FLIGHT_CODE) {
        next.push(this.requeued(entry, at));
        continue;
      }

      if (result.outcome === "conflict") {
        next.push({
          ...entry,
          status: "conflict",
          conflict: {
            kind: classifyConflict(result.code),
            code: result.code,
            reason: result.reason ?? "The server refused this operation.",
          },
        });
        continue;
      }

      next.push(
        entry.attempts >= this.maxAttempts
          ? {
              ...entry,
              status: "conflict",
              conflict: {
                kind: "rejected",
                code: result.code,
                reason:
                  result.reason ??
                  "This operation could not be applied after several attempts.",
              },
            }
          : this.requeued(entry, at),
      );
    }

    await this.commit(next);
  }

  async releaseUnsent(ids: readonly string[]): Promise<void> {
    const at = this.now();
    await this.patch(ids, (entry) =>
      entry.attempts >= this.maxAttempts
        ? {
            ...entry,
            status: "conflict",
            conflict: {
              kind: "rejected",
              reason:
                "This operation could not be sent after several attempts. Check your connection.",
            },
          }
        : this.requeued(entry, at),
    );
  }

  async markUnauthorized(
    ids: readonly string[],
    error: unknown,
  ): Promise<void> {
    const reason = getErrorMessage(error);
    await this.patch(ids, (entry) => ({
      ...entry,
      status: "conflict",
      conflict: { kind: "unauthorized", reason } satisfies OutboxConflict,
    }));
  }

  async retry(clientOperationIds: readonly string[]): Promise<void> {
    await this.patch(clientOperationIds, (entry) => ({
      ...entry,
      status: "queued",
      attempts: 0,
      nextAttemptAt: 0,
      conflict: undefined,
    }));
  }

  async discard(clientOperationIds: readonly string[]): Promise<void> {
    for (const id of clientOperationIds) this.rows.delete(id);
    this.publish();
    await this.storage.remove(clientOperationIds).catch(() => undefined);
  }

  async clearSynced(olderThanMs = 0): Promise<void> {
    const cutoff = this.now() - olderThanMs;
    const stale = this.cached
      .filter((e) => e.status === "synced" && (e.syncedAt ?? 0) <= cutoff)
      .map((e) => e.clientOperationId);
    if (stale.length > 0) await this.discard(stale);
  }

  private requeued(entry: OutboxEntry, at: number): OutboxEntry {
    return {
      ...entry,
      status: "queued",
      nextAttemptAt: at + backoffDelayMs(entry.attempts, this.random),
      conflict: undefined,
    };
  }

  private async patch(
    ids: readonly string[],
    change: (entry: OutboxEntry) => OutboxEntry,
  ): Promise<void> {
    const next: OutboxEntry[] = [];
    for (const id of ids) {
      const entry = this.rows.get(id);
      if (entry) next.push(change(entry));
    }
    await this.commit(next);
  }

  private async commit(entries: readonly OutboxEntry[]): Promise<void> {
    if (entries.length === 0) return;
    for (const entry of entries) this.rows.set(entry.clientOperationId, entry);
    this.publish();
    await this.persist(entries);
  }

  private async persist(entries: readonly OutboxEntry[]): Promise<void> {
    try {
      await this.storage.save(entries);
    } catch {
      this.storageFailed = true;
    }
  }

  private publish(): void {
    this.cached = [...this.rows.values()].sort(byOperatorOrder);
    for (const listener of this.listeners) listener();
  }
}
