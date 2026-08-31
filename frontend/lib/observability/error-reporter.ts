import { redact } from "./redact";

export interface FrontendContext {
  orgId?: string;
  actorId?: string;
  /** The id of the most recent API call, so a report joins the backend's logs. */
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

/**
 * Replaces who the user is wholesale, so signing out clears the previous person
 * instead of leaving them attached to the next one's errors.
 *
 * The correlation id survives, because it belongs to the last request rather
 * than to the session: this runs on every session-object change, and dropping it
 * here would leave errors unjoinable to the backend until the next API call.
 */
export function setSessionContext(context: FrontendContext): void {
  session = { ...context, correlationId: context.correlationId ?? session.correlationId };
}

/** Called by the API client so the newest request id is the one a report carries. */
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

/**
 * Never throws. A tracker that is down must not turn a caught error into a blank
 * page.
 */
export function reportError(error: unknown, extra?: Record<string, unknown>): void {
  try {
    active.report({
      error,
      context: { ...session, url: currentUrl() },
      ...(extra !== undefined ? { extra: redact(extra) as Record<string, unknown> } : {}),
    });
  } catch {
    // Deliberately swallowed: see above.
  }
}
