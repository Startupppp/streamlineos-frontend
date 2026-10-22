import { newCorrelationId, newTraceparent } from "./correlation";
import { noteCorrelationId } from "./error-reporter";

export const CORRELATION_HEADER = "x-correlation-id";
export const TRACEPARENT_HEADER = "traceparent";

export function withCorrelation(headers: Headers): Headers {
  if (headers.has(CORRELATION_HEADER)) return headers;
  const correlationId = newCorrelationId();
  headers.set(CORRELATION_HEADER, correlationId);
  if (typeof window !== "undefined") noteCorrelationId(correlationId);
  return headers;
}

export function withTraceContext(init: RequestInit): RequestInit {
  const headers = new Headers(init.headers);
  if (!headers.has(TRACEPARENT_HEADER)) headers.set(TRACEPARENT_HEADER, newTraceparent());
  return { ...init, headers };
}
