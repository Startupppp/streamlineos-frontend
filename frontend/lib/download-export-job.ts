import { apiClient } from "@/lib/api-client";
import { downloadExport } from "@/lib/download-export";


const POLL_INTERVAL_MS = 1_500;
const POLL_TIMEOUT_MS = 120_000;

export type ExportJobStatus = "pending" | "running" | "completed" | "failed" | "expired" | string;

export interface ExportJobSnapshot {
  id: string;
  status: ExportJobStatus;
  errorMessage?: string | null;
}

export class ExportJobFailedError extends Error {
  constructor(label: string, reason: string | null | undefined) {
    super(reason?.trim() ? `The ${label} export failed: ${reason}` : `The ${label} export failed.`);
    this.name = "ExportJobFailedError";
  }
}

export class ExportJobExpiredError extends Error {
  constructor(label: string) {
    super(`The ${label} export expired before it was downloaded. Start a new export.`);
    this.name = "ExportJobExpiredError";
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
  create: string;
  status: (jobId: string) => string;
  download: (jobId: string) => string;
}

export interface DownloadExportJobOptions {
  label: string;
  fallbackName: string;
  routes: ExportJobRoutes;
  body?: Record<string, unknown>;
  idempotencyKey: string;
  signal?: AbortSignal;
  now?: () => number;
  wait?: (ms: number) => Promise<void>;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function isTerminal(status: ExportJobStatus): boolean {
  return status === "completed" || status === "failed" || status === "expired";
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

  if (job.status === "failed") throw new ExportJobFailedError(options.label, job.errorMessage);
  if (job.status === "expired") throw new ExportJobExpiredError(options.label);

  return downloadExport(options.routes.download(created.id), {
    label: options.label,
    fallbackName: options.fallbackName,
    signal: options.signal,
  });
}
