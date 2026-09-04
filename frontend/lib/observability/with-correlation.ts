import { newCorrelationId, newTraceparent } from "./correlation";
import { noteCorrelationId } from "./error-reporter";

export const CORRELATION_HEADER = "x-correlation-id";
export const TRACEPARENT_HEADER = "traceparent";

/**
 * Stamps one request with the id the backend will put on every log line it
 * writes for that request, so a browser error report and the server-side trace
 * for the same user intent can be joined.
 *
 * Every wrapper that talks to the API has to do this, not just the main client:
 * an intent that starts in the portal, in a server component, or on the
 * notification stream is otherwise unjoinable to the work it causes. An id
 * already present is kept, so a caller that has one does not lose it.
 *
 * `noteCorrelationId` is browser-only on purpose. It writes to a module-level
 * singleton that backs the error reporter; on the server that singleton is
 * shared by every concurrent request, so recording there would attach one
 * tenant's id to another's report.
 */
export function withCorrelation(headers: Headers): Headers {
  if (headers.has(CORRELATION_HEADER)) return headers;
  const correlationId = newCorrelationId();
  headers.set(CORRELATION_HEADER, correlationId);
  if (typeof window !== "undefined") noteCorrelationId(correlationId);
  return headers;
}

/**
 * Trace context for a request whose response Next is allowed to cache.
 *
 * Next derives its data-cache key from the request headers and strips only
 * `traceparent`/`tracestate`, so this is the sole carrier that correlates a
 * cached read without turning every one of them into a cache miss.
 */
export function withTraceContext(init: RequestInit): RequestInit {
  const headers = new Headers(init.headers);
  if (!headers.has(TRACEPARENT_HEADER)) headers.set(TRACEPARENT_HEADER, newTraceparent());
  return { ...init, headers };
}
