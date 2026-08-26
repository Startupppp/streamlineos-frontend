import type { ErrorReport, ErrorReporter } from "./error-reporter";
import { redact } from "./redact";

const RELEASE: string | undefined = process.env.NEXT_PUBLIC_APP_VERSION;

function serializeError(error: unknown): unknown {
  if (error instanceof Error) {
    const out: Record<string, unknown> = {
      name: error.name,
      message: error.message,
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
