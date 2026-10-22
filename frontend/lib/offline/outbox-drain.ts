import { isApiError } from "@/lib/api-client";
import { OUTBOX_BATCH_SIZE, type OutboxQueue } from "./outbox-queue";
import type { OutboxEntry, SyncBatchResult } from "./outbox-types";

export interface OutboxTransport {
  send(operations: readonly OutboxEntry["operation"][]): Promise<SyncBatchResult>;
}

export interface DrainReport {
  sent: number;
  applied: number;
  duplicates: number;
  conflicts: number;
  failures: number;
  transportError?: unknown;
}

const IDLE: DrainReport = {
  sent: 0,
  applied: 0,
  duplicates: 0,
  conflicts: 0,
  failures: 0,
};

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
  intervalMs?: number;
  isOnline?: () => boolean;
  onDrained?: (report: DrainReport) => void;
  batchSize?: number;
}

export interface DrainLoop {
  request(): Promise<DrainReport>;
  stop(): void;
}

const DEFAULT_INTERVAL_MS = 30_000;

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
