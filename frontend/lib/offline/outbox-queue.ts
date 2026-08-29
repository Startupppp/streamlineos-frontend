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

/**
 * B8 — the device's outbox.
 *
 * One rule holds the whole thing up, and everything else here exists to serve
 * it: **an entry is marked synced only when the server has said so about that
 * entry.** Not when the request left, not when the batch came back 200, not
 * when the drain finished without throwing — when the per-operation result for
 * that exact `clientOperationId` says `applied` or `duplicate`.
 *
 * The second rule is the first one's mirror: the id is minted once, in
 * `enqueue`, and is never regenerated. A retry that mints a fresh id is a
 * second stock movement that nobody asked for and nobody can see happened,
 * because both movements look perfectly legitimate in the ledger. Everything
 * about how this file is written — storing the whole request body rather than
 * rebuilding it, keying the object store on the id, refusing a duplicate insert
 * — is a way of making that mistake hard to make later.
 */

/** How many operations one batch carries. The server caps at 100. */
export const OUTBOX_BATCH_SIZE = 50;

/**
 * How many times a *transport* failure is retried before the entry is put in
 * front of a human. A queue that retries forever is a queue whose badge never
 * clears and whose operator stops looking at it.
 */
export const OUTBOX_MAX_ATTEMPTS = 8;

const BACKOFF_BASE_MS = 2_000;
const BACKOFF_CEILING_MS = 5 * 60_000;

/**
 * Exponential with full jitter.
 *
 * The jitter is not decoration. Every device in a warehouse loses the same
 * access point and reconnects on the same second; a fixed backoff has them all
 * retry together, which is how a recovering network is knocked over again by
 * the devices waiting for it.
 */
export function backoffDelayMs(attempts: number, random: () => number): number {
  const ceiling = Math.min(
    BACKOFF_CEILING_MS,
    BACKOFF_BASE_MS * 2 ** Math.max(0, attempts - 1),
  );
  return Math.round(ceiling * random());
}

/**
 * Which of the operator's three answers this conflict deserves.
 *
 * Keyed on the server's structured code rather than its prose, so rewording a
 * message cannot silently change what the operator is offered.
 */
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

/**
 * Another copy of this operation is mid-flight somewhere. Not a conflict a
 * human can do anything about — the right answer is to wait and send again,
 * which is exactly what a backoff is for.
 */
const IN_FLIGHT_CODE = "DUPLICATE_IDEMPOTENCY_KEY";

export function classifyConflict(code: string | undefined): OutboxConflictKind {
  if (code && INSUFFICIENT_CODES.has(code)) return "insufficient";
  if (code && STALE_CODES.has(code)) return "stale";
  return "rejected";
}

export interface OutboxQueueOptions {
  storage?: OutboxStorage;
  /** Injected so a test can pin the clock. */
  now?: () => number;
  /** Injected so a test can pin the jitter. */
  random?: () => number;
  /** Injected so a test can pin the ids it asserts on. */
  newOperationId?: () => string;
  maxAttempts?: number;
}

function defaultOperationId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // Only reached on a browser with no `randomUUID`. Still 128 bits of entropy;
  // a counter or a timestamp would collide across two tabs on one device, and
  // a collision here means two different operations sharing one movement.
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** The order the server replays in, reproduced here so a batch arrives sorted. */
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

  /**
   * Read what is on disk, once.
   *
   * Anything left `in-flight` belongs to a tab that was closed or crashed
   * mid-send, and it is returned to `queued` rather than left stuck: the id is
   * stable, so re-sending it is free — the server either applies it or reports
   * it as a duplicate. Leaving it `in-flight` forever would be the one failure
   * mode this queue exists to prevent, dressed as caution.
   */
  hydrate(): Promise<void> {
    return (this.hydrated ??= this.loadOnce());
  }

  private async loadOnce(): Promise<void> {
    let stored: OutboxEntry[] = [];
    try {
      stored = await this.storage.all();
    } catch {
      // A browser that refuses to open a database still has to let the operator
      // work. The queue runs in memory for this session and says so through
      // `storageAvailable`.
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

  /** False when this session's queue lives only in memory. */
  get storageAvailable(): boolean {
    return !this.storageFailed;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Stable between changes, so `useSyncExternalStore` does not loop. */
  getSnapshot = (): readonly OutboxEntry[] => this.cached;

  counts(): OutboxCounts {
    return countEntries(this.cached);
  }

  /**
   * Record an operation, and mint its idempotency key.
   *
   * This is the only place an id is created. `occurredAt` is stamped here too
   * — when the operator did it, not when it is eventually sent — because the
   * server replays a batch in that order, and two corrections to one bin have
   * to land in the order the human made them or the final position is a coin
   * toss.
   */
  async enqueue(
    draft: OutboxOperationDraft,
    options: { label?: string } = {},
  ): Promise<OutboxEntry> {
    await this.hydrate();
    const at = this.now();
    const operation = {
      ...draft,
      clientOperationId: this.newOperationId(),
      occurredAt: new Date(at).toISOString(),
    } as OutboxOperation;

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
      // Held in memory anyway. Dropping the entry because the disk refused it
      // would lose an operation the operator has already been shown as queued,
      // which is the one thing worse than losing it on reload.
      this.storageFailed = true;
      void error;
    }
    return entry;
  }

  /**
   * The entries a drain may send right now, in the order the operator worked.
   *
   * `nextAttemptAt` is the backoff, and a conflicted entry is never included —
   * it is waiting on a human, and re-sending it would produce the same conflict
   * and reset the count they are looking at.
   */
  dueEntries(limit = OUTBOX_BATCH_SIZE): readonly OutboxEntry[] {
    const at = this.now();
    return this.cached
      .filter((entry) => entry.status === "queued" && entry.nextAttemptAt <= at)
      .sort(byOperatorOrder)
      .slice(0, limit);
  }

  /** Move entries to `in-flight`. They are not synced, and must not read as it. */
  async markInFlight(ids: readonly string[]): Promise<void> {
    await this.patch(ids, (entry) => ({
      ...entry,
      status: "in-flight",
      attempts: entry.attempts + 1,
    }));
  }

  /**
   * Apply the server's per-operation verdicts.
   *
   * `applied` and `duplicate` are both success: a duplicate means an earlier
   * attempt landed and the stable key stopped this one from landing again,
   * which is the entire point of the key. Marking a duplicate as anything else
   * would have the operator re-enter work that is already done.
   */
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

      // Another copy is mid-flight. Nobody needs to be told; wait and resend.
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

      // `failed` — an unexpected error inside the operation. Worth another go,
      // but not forever: past the attempt ceiling it goes in front of a human
      // rather than cycling invisibly.
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

  /**
   * The batch never reached the server, or its answer never reached us.
   *
   * Back to `queued` with a longer wait — never `synced`, and never dropped.
   * We do not know whether the operations landed, and the stable key is what
   * makes it safe not to know: sending them again costs at most a `duplicate`.
   */
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

  /**
   * The session expired mid-drain.
   *
   * Parked as a conflict the operator can see, not dropped and not retried on a
   * timer: retrying a 401 in a loop signs the device out repeatedly and the
   * queue never clears. The entry keeps its id, so replaying after a fresh sign
   * in is free.
   */
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

  /**
   * A human decided to send it again — after signing back in, or after looking
   * at the shelf. The id does not change, so if the original did land after
   * all, this replay is a duplicate and moves nothing.
   */
  async retry(clientOperationIds: readonly string[]): Promise<void> {
    await this.patch(clientOperationIds, (entry) => ({
      ...entry,
      status: "queued",
      attempts: 0,
      nextAttemptAt: 0,
      conflict: undefined,
    }));
  }

  /** A human decided the operation should not happen. The only way an entry leaves unsent. */
  async discard(clientOperationIds: readonly string[]): Promise<void> {
    for (const id of clientOperationIds) this.rows.delete(id);
    this.publish();
    await this.storage.remove(clientOperationIds).catch(() => undefined);
  }

  /**
   * Clear the acknowledged tail.
   *
   * Synced entries are kept for a while on purpose — "12 synced" is the
   * evidence an operator needs that their shift went through, and a queue that
   * empties itself the instant it succeeds looks identical to one that dropped
   * the work.
   */
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
      // In memory the state is already correct. A device whose disk stopped
      // answering must not have its queue reverted on screen as a result.
      this.storageFailed = true;
    }
  }

  private publish(): void {
    this.cached = [...this.rows.values()].sort(byOperatorOrder);
    for (const listener of this.listeners) listener();
  }
}
