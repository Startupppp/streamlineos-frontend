import { redactRecord } from "./redact";

export interface FrontendContext {
  orgId?: string;
  actorId?: string;
  correlationId?: string;
  url?: string;
}

export interface ErrorReport {
  readonly error: unknown;
  readonly context: FrontendContext;
  readonly extra?: Record<string, unknown>;
}

export interface ErrorReporter {
  report(report: ErrorReport): void;
}

const noopReporter: ErrorReporter = { report: () => undefined };

let active: ErrorReporter = noopReporter;
let session: FrontendContext = {};

export function setErrorReporter(reporter: ErrorReporter): void {
  active = reporter;
}

export function resetErrorReporter(): void {
  active = noopReporter;
}

export function setSessionContext(context: FrontendContext): void {
  session = { ...context, correlationId: context.correlationId ?? session.correlationId };
}

export function noteCorrelationId(correlationId: string): void {
  session = { ...session, correlationId };
}

function currentUrl(): string | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.location.href;
  } catch {
    return undefined;
  }
}

export function reportError(error: unknown, extra?: Record<string, unknown>): void {
  try {
    active.report({
      error,
      context: { ...session, url: currentUrl() },
      ...(extra !== undefined ? { extra: redactRecord(extra) } : {}),
    });
  } catch {
  }
}
