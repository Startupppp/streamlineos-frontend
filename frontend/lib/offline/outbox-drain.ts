import { isApiError } from "@/lib/api-client";
import { OUTBOX_BATCH_SIZE, type OutboxQueue } from "./outbox-queue";
import type { OutboxEntry, SyncBatchResult } from "./outbox-types";

/**
 * B8 — replaying the queue.
 *
 * Written against a transport port rather than `apiClient` directly, for the
 * same reason the queue is written against a storage port: the properties worth
 * proving — that nothing is marked synced before an ack, that a transport
 * failure leaves the entry queued, that a duplicate replay is still one
 * movement — are properties of this control flow, and testing them through a
 * mocked `fetch` would prove things about `fetch`.
 */
export interface OutboxTransport {
  /**
   * `POST /inventory/sync/batch`. Sends the operations **verbatim** — this is
   * the one place the frozen payloads reach the wire, and it must not touch
   * them. Rebuilding a body here would be a second place the idempotency key
   * could be regenerated.
   */
  send(operations: readonly OutboxEntry["operation"][]): Promise<SyncBatchResult>;
}

export interface DrainReport {
  /** How many operations this pass put on the wire. */
  sent: number;
  applied: number;
  duplicates: number;
  conflicts: number;
  failures: number;
  /** Set when the batch never got an answer. */
  transportError?: unknown;
}

const IDLE: DrainReport = {
  sent: 0,
  applied: 0,
  duplicates: 0,
  conflicts: 0,
  failures: 0,
};

/**
 * One pass: take what is due, send it, record what the server said.
 *
 * The ordering of the three writes is the correctness of the whole unit.
 * `markInFlight` happens *before* the request so a second concurrent pass
 * cannot pick the same entries up; `applyResults` happens only after a
 * response, keyed per operation; and every path out of a failure goes through
 * `releaseUnsent` or `markUnauthorized`, neither of which can produce `synced`.
 * There is deliberately no branch that marks an entry done without a result for
 * that entry's own id.
 */
export async function drainOnce(
  queue: OutboxQueue,
  transport: OutboxTransport,
  batchSize: number = OUTBOX_BATCH_SIZE,
): Promise<DrainReport> {
  await queue.hydrate();

  const due = queue.dueEntries(batchSize);
  if (due.length === 0) return IDLE;

  const ids = due.map((entry) => entry.clientOperationId);
  await queue.markInFlight(ids);

  try {
    const result = await transport.send(due.map((entry) => entry.operation));
    await queue.applyResults(result.results);

    // Anything the server did not mention is not an answer. It goes back to
    // the queue rather than being assumed applied: an id missing from the
    // response is the one case where guessing costs a duplicate movement or a
    // lost count, and there is no need to guess.
    const answered = new Set(result.results.map((r) => r.clientOperationId));
    const unanswered = ids.filter((id) => !answered.has(id));
    if (unanswered.length > 0) await queue.releaseUnsent(unanswered);

    return {
      sent: due.length,
      applied: result.applied,
      duplicates: result.duplicates,
      conflicts: result.conflicts,
      failures: result.failures,
    };
  } catch (error) {
    // The session expired. Parked in front of the operator with the ids intact,
    // never dropped: after signing in again the same entries replay under the
    // same keys, so whatever did land stays landed.
    if (isApiError(error) && error.status === 401) {
      await queue.markUnauthorized(ids, error);
      return { ...IDLE, sent: due.length, transportError: error };
    }
    await queue.releaseUnsent(ids);
    return { ...IDLE, sent: due.length, transportError: error };
  }
}

export interface DrainLoopOptions {
  queue: OutboxQueue;
  transport: OutboxTransport;
  /** How often to try while the device believes it is online. */
  intervalMs?: number;
  isOnline?: () => boolean;
  onDrained?: (report: DrainReport) => void;
  batchSize?: number;
}

export interface DrainLoop {
  /**
   * Ask for a pass now — on reconnect, on an enqueue, on a button. Resolves
   * with what the pass did, or with an idle report when it was skipped because
   * the device is offline or a pass was already running. It always resolves, so
   * a caller showing a pending state on a button is never left with a spinner
   * that has nothing to wait for.
   */
  request(): Promise<DrainReport>;
  stop(): void;
}

const DEFAULT_INTERVAL_MS = 30_000;

/**
 * The background loop.
 *
 * Two guarantees, both about not making a bad situation worse. Only one pass
 * runs at a time — `running` is checked before every start, and a request that
 * arrives mid-pass sets a flag rather than launching a second one, because two
 * concurrent passes would each claim entries and each retry the other's. And
 * nothing is attempted while the device believes it is offline: a fetch on a
 * dead radio is a thirty-second timeout that blocks the next attempt, so the
 * queue drains *slower* for trying.
 */
export function startDrainLoop(options: DrainLoopOptions): DrainLoop {
  const {
    queue,
    transport,
    intervalMs = DEFAULT_INTERVAL_MS,
    isOnline = () => (typeof navigator === "undefined" ? true : navigator.onLine),
    onDrained,
    batchSize,
  } = options;

  let running = false;
  let pendingRequest = false;
  let stopped = false;

  const pass = async (): Promise<DrainReport> => {
    if (stopped) return IDLE;
    if (running) {
      pendingRequest = true;
      return IDLE;
    }
    if (!isOnline()) return IDLE;

    running = true;
    let report = IDLE;
    try {
      report = await drainOnce(queue, transport, batchSize);
      onDrained?.(report);
    } finally {
      running = false;
    }

    if (pendingRequest && !stopped) {
      pendingRequest = false;
      void pass();
    }
    return report;
  };

  const request = (): Promise<DrainReport> => pass();

  const timer = setInterval(() => {
    void request();
  }, intervalMs);
  const onOnline = (): void => {
    void request();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("online", onOnline);
  }

  // The first pass on mount, so a tab reopened after an outage does not wait a
  // full interval before showing the operator their queue clearing.
  request();

  return {
    request,
    stop: () => {
      stopped = true;
      clearInterval(timer);
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onOnline);
      }
    },
  };
}
