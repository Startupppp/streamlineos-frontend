import type { ErrorReport, ErrorReporter } from "./error-reporter";
import { redact } from "./redact";

const RELEASE: string | undefined = process.env.NEXT_PUBLIC_APP_VERSION;

function apiDiagnostics(error: Error): Record<string, unknown> {
  const candidate = error as Partial<{
    status: number;
    code: string;
    endpoint: string;
    details: unknown;
  }>;
  const out: Record<string, unknown> = {};
  if (typeof candidate.status === "number") out.status = candidate.status;
  if (typeof candidate.code === "string") out.code = candidate.code;
  if (typeof candidate.endpoint === "string") out.endpoint = candidate.endpoint;
  if (candidate.details !== undefined) out.details = redact(candidate.details);
  return out;
}

function serializeError(error: unknown): unknown {
  if (error instanceof Error) {
    const out: Record<string, unknown> = {
      name: error.name,
      message: error.message,
      ...apiDiagnostics(error),
    };
    if (error.stack) out.stack = error.stack;
    return out;
  }
  return redact(error);
}

export const consoleReporter: ErrorReporter = {
  report({ error, context, extra }: ErrorReport): void {
    try {
      const entry: Record<string, unknown> = {
        level: "error",
        source: "browser",
        timestamp: new Date().toISOString(),
        error: serializeError(error),
        context,
      };
      if (RELEASE !== undefined) entry.release = RELEASE;
      if (extra !== undefined) entry.extra = extra;
      console.error(JSON.stringify(entry));
    } catch {
    }
  },
};
