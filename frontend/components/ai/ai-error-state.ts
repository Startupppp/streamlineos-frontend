import { isApiError } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";

export type AiFailureState =
  | { status: "quota" }
  | { status: "denied"; reason: string }
  | { status: "queued"; message: string }
  | { status: "unavailable"; message: string }
  | { status: "offline"; message: string }
  | { status: "cancelled" }
  | { status: "error"; message: string };

export type AiFailureStatus = AiFailureState["status"];

const QUEUE_MESSAGE = "Too many AI requests right now. Try again in a moment.";
const UNAVAILABLE_MESSAGE =
  "The AI provider is temporarily unavailable. Try again shortly.";
const OFFLINE_MESSAGE =
  "You appear to be offline. Reconnect and try again.";

/**
 * The concurrency cap and the circuit breaker both answer 503 and neither
 * carries a `code`, so this phrase is the only thing that separates "back off,
 * the queue is full" from "the provider is down". Replace it with a code check
 * the moment the backend gives those exceptions distinct codes.
 */
const CONCURRENCY_CAP_PHRASE = "too many concurrent";

const CLIENT_PERMISSION_PREFIX = "Missing permission:";

function isAbort(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && error.name === "AbortError") return true;
  return isApiError(error) && error.code === "ABORTED";
}

function isOffline(error: unknown): boolean {
  if (isApiError(error) && error.code === "NETWORK_ERROR") return true;
  return (
    typeof navigator !== "undefined" &&
    "onLine" in navigator &&
    navigator.onLine === false
  );
}

function isClientPermissionRefusal(error: unknown): boolean {
  return (
    error instanceof Error && error.message.startsWith(CLIENT_PERMISSION_PREFIX)
  );
}

export function classifyAiError(error: unknown): AiFailureState {
  if (isAbort(error)) return { status: "cancelled" };
  if (isOffline(error)) return { status: "offline", message: OFFLINE_MESSAGE };
  if (isClientPermissionRefusal(error))
    return { status: "denied", reason: getErrorMessage(error) };

  if (!isApiError(error)) return { status: "error", message: getErrorMessage(error) };

  const { status, code } = error;

  if (status === 402) {
    if (code === "INSUFFICIENT_CREDITS") return { status: "quota" };
    if (code === "MODULE_NOT_ENABLED")
      return { status: "denied", reason: getErrorMessage(error) };
    return { status: "quota" };
  }

  if (status === 403) return { status: "denied", reason: getErrorMessage(error) };

  if (status === 429) return { status: "queued", message: QUEUE_MESSAGE };

  if (status === 503) {
    return error.message.toLowerCase().includes(CONCURRENCY_CAP_PHRASE)
      ? { status: "queued", message: QUEUE_MESSAGE }
      : { status: "unavailable", message: UNAVAILABLE_MESSAGE };
  }

  if (status === 502 || status === 504 || code === "TIMEOUT")
    return { status: "unavailable", message: UNAVAILABLE_MESSAGE };

  return { status: "error", message: getErrorMessage(error) };
}

export function isRetryableAiFailure(status: AiFailureStatus): boolean {
  return (
    status === "error" ||
    status === "queued" ||
    status === "unavailable" ||
    status === "offline" ||
    status === "cancelled"
  );
}
