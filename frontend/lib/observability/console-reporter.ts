import type { ErrorReport, ErrorReporter } from "./error-reporter";
import { redact } from "./redact";

const RELEASE: string | undefined = process.env.NEXT_PUBLIC_APP_VERSION;

function apiDiagnostics(error: Error): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if ("status" in error && typeof error.status === "number") out.status = error.status;
  if ("code" in error && typeof error.code === "string") out.code = error.code;
  if ("endpoint" in error && typeof error.endpoint === "string") out.endpoint = error.endpoint;
  if ("details" in error && error.details !== undefined) out.details = redact(error.details);
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
