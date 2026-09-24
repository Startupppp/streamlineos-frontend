import { apiClient } from "@/lib/api-client";
import { downloadExport } from "@/lib/download-export";

/**
 * Runs an asynchronous export job to completion and saves the file.
 *
 * Two export contracts exist. Small entities serve the CSV straight from a GET;
 * larger ones — expenses, the employee directory — create a job, report progress
 * and hand over a download URL when it finishes. The Settings screen only knew
 * the first, and its Expenses card pointed at `GET /hr/expenses/export`, a route
 * that has never existed: the backend has `POST /hr/expenses/export/jobs`. QA's
 * "Cannot GET /hr/expenses/export" was the express router saying exactly that.
 *
 * This is the job contract in one place, so a card can name either shape and
 * Settings and the module page go through the same code.
 */

const POLL_INTERVAL_MS = 1_500;
const POLL_TIMEOUT_MS = 120_000;

export type ExportJobStatus = "pending" | "running" | "completed" | "failed" | string;

export interface ExportJobSnapshot {
  id: string;
  status: ExportJobStatus;
  error?: string | null;
}

export class ExportJobFailedError extends Error {
  constructor(label: string, reason: string | null | undefined) {
    super(reason?.trim() ? `The ${label} export failed: ${reason}` : `The ${label} export failed.`);
    this.name = "ExportJobFailedError";
  }
}

export class ExportJobTimeoutError extends Error {
  constructor(label: string) {
    super(
      `The ${label} export is taking longer than expected. It is still running — check back from the export history.`,
    );
    this.name = "ExportJobTimeoutError";
  }
}

export interface ExportJobRoutes {
  /** Where the job is created, e.g. `/hr/expenses/export/jobs`. */
  create: string;
  /** Given a job id, where its state is read. */
  status: (jobId: string) => string;
  /** Given a job id, where the finished file is fetched. */
  download: (jobId: string) => string;
}

export interface DownloadExportJobOptions {
  label: string;
  fallbackName: string;
  routes: ExportJobRoutes;
  body?: Record<string, unknown>;
  idempotencyKey: string;
  signal?: AbortSignal;
  /** Injected by tests; real callers use the default clock. */
  now?: () => number;
  wait?: (ms: number) => Promise<void>;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function isTerminal(status: ExportJobStatus): boolean {
  return status === "completed" || status === "failed";
}

export async function downloadExportJob(
  options: DownloadExportJobOptions,
): Promise<{ filename: string; bytes: number }> {
  const now = options.now ?? Date.now;
  const wait = options.wait ?? sleep;
  const startedAt = now();

  const created = await apiClient.post<ExportJobSnapshot>(
    options.routes.create,
    options.body ?? {},
    { headers: { "Idempotency-Key": options.idempotencyKey }, signal: options.signal },
  );

  let job = created;
  while (!isTerminal(job.status)) {
    if (now() - startedAt > POLL_TIMEOUT_MS) throw new ExportJobTimeoutError(options.label);
    await wait(POLL_INTERVAL_MS);
    job = await apiClient.get<ExportJobSnapshot>(
      options.routes.status(created.id),
      undefined,
      options.signal,
    );
  }

  if (job.status === "failed") throw new ExportJobFailedError(options.label, job.error);

  // The same guard the synchronous path uses: a finished job that hands back an
  // empty body or an error page must not be saved as the export.
  return downloadExport(options.routes.download(created.id), {
    label: options.label,
    fallbackName: options.fallbackName,
    signal: options.signal,
  });
}
