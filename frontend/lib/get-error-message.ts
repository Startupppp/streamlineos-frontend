const NETWORK_PATTERN = /failed to fetch|networkerror|network request failed|load failed|fetch failed/i;
const HOST_IN_MESSAGE = /contacting\s+([a-z0-9-]+(?:\.[a-z0-9-]+)*)/i;
const REQUEST_IN_MESSAGE = /\(((?:GET|POST|PUT|PATCH|DELETE)\s+[^)]+)\)/i;
const CHUNK_PATTERN = /chunkloaderror|loading chunk \S+ failed|(?:failed|error) (?:to fetch|loading) dynamically imported module|importing a module script failed/i;
const GENERIC_SERVER_PATTERN =
  /^(?:an unexpected error occurred|unexpected error|internal server error)$/i;
const BARE_STATUS = /^(\d{3})(\s|$)/;
/** The filter's own headline for a Zod refusal; the issues say more than it does. */
const VALIDATION_HEADLINE = /^validation failed\.?$/i;

const GENERIC_MESSAGE = "Something went wrong. Please try again.";
const STALE_BUILD_MESSAGE =
  "A new version of the app is available. Please refresh the page and try again.";

const REASON_PHRASE_STATUS: Record<string, number> = {
  "bad request": 400,
  unauthorized: 401,
  "payment required": 402,
  forbidden: 403,
  "not found": 404,
  "method not allowed": 405,
  "request timeout": 408,
  conflict: 409,
  "payload too large": 413,
  "unsupported media type": 415,
  "unprocessable entity": 422,
  "too many requests": 429,
  "internal server error": 500,
  "bad gateway": 502,
  "service unavailable": 503,
  "gateway timeout": 504,
};

function statusFallback(code: number): string {
  if (code === 400) return "The request was invalid. Please check your input and try again.";
  if (code === 401) return "Your session expired. Please sign in again.";
  if (code === 402) return "You've reached a credit or plan limit for this action.";
  if (code === 403) return "You don't have permission for this action.";
  if (code === 404) return "The requested item could not be found.";
  if (code === 408) return "The request timed out. Please try again.";
  if (code === 409) return "This action conflicts with existing data.";
  if (code === 413) return "The file or request is too large.";
  if (code === 415) return "That file type isn't supported.";
  if (code === 422) return "Some of the information provided is invalid.";
  if (code === 429) return "Too many requests. Please wait a moment and try again.";
  if (code >= 500) return "Something went wrong on our end. Please try again shortly.";
  return "The request could not be completed. Please try again.";
}

function readMessageValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .join(", ");
  }
  return "";
}

function extractMessage(error: unknown, depth = 0): string {
  if (typeof error === "string") return error.trim();
  if (error instanceof Error) {
    const own = error.message.trim();
    if (own) return own;
    return depth < 3 ? extractMessage(error.cause, depth + 1) : "";
  }
  if (error && typeof error === "object") {
    if ("message" in error) {
      const fromMessage = readMessageValue(error.message);
      if (fromMessage) return fromMessage;
    }
    if ("error" in error) {
      const fromError = readMessageValue(error.error);
      if (fromError) return fromError;
    }
  }
  return "";
}

/**
 * The field-level issues a validation refusal already carried.
 *
 * `AllExceptionsFilter` answers every `ZodError` with `"Validation failed."` and
 * puts the issues -- the path and what was wrong with it -- in `details`.
 * Nothing here ever read them, so a refusal that knew exactly which control was
 * at fault arrived as three words. The CRM assignment-rule sheet lost three of
 * its five options behind that sentence, and the only way anyone found out was
 * reading the server.
 *
 * Capped, because this ends up in a toast: enough to name the problem, not a
 * wall. `VALIDATION_ISSUE_LIMIT` issues then a count of the rest.
 */
const VALIDATION_ISSUE_LIMIT = 3;

function isValidationIssue(value: unknown): value is { path?: unknown; message: string } {
  return (
    !!value &&
    typeof value === "object" &&
    "message" in value &&
    typeof (value as { message: unknown }).message === "string" &&
    !!(value as { message: string }).message.trim()
  );
}

function describeIssue(issue: { path?: unknown; message: string }): string {
  const path = typeof issue.path === "string" ? issue.path.trim() : "";
  // "body" is the filter's stand-in for an issue with no path; naming it tells
  // the reader nothing they can act on.
  if (!path || path === "body") return issue.message.trim();
  return `${path}: ${issue.message.trim()}`;
}

function validationDetail(error: unknown): string {
  if (!error || typeof error !== "object" || !("details" in error)) return "";
  const details = (error as { details: unknown }).details;
  if (!Array.isArray(details)) return "";

  const issues = details.filter(isValidationIssue).map(describeIssue).filter(Boolean);
  if (issues.length === 0) return "";

  const shown = issues.slice(0, VALIDATION_ISSUE_LIMIT);
  const hidden = issues.length - shown.length;
  return hidden > 0 ? `${shown.join("; ")} (and ${hidden} more)` : shown.join("; ");
}

function extractStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  if ("status" in error && typeof error.status === "number") return error.status;
  if ("statusCode" in error && typeof error.statusCode === "number") return error.statusCode;
  return undefined;
}

function networkMessage(message: string): string {
  const hostMatch = HOST_IN_MESSAGE.exec(message);
  if (hostMatch?.[1]) {
    const request = REQUEST_IN_MESSAGE.exec(message);
    const context = request?.[1] ? ` (${request[1]})` : "";
    return `Network error contacting ${hostMatch[1]}${context}. Check your connection and try again.`;
  }

  return "Network error. Check your connection and try again.";
}

export function getErrorMessage(error: unknown): string {
  const message = extractMessage(error);
  const status = extractStatus(error);

  const detail = validationDetail(error);
  if (detail) return message && !VALIDATION_HEADLINE.test(message) ? `${message} ${detail}` : detail;

  if (!message || message === "[object Object]")
    return status === undefined ? GENERIC_MESSAGE : statusFallback(status);


  if (CHUNK_PATTERN.test(message)) return STALE_BUILD_MESSAGE;
  if (NETWORK_PATTERN.test(message) || HOST_IN_MESSAGE.test(message)) 
    return networkMessage(message);
  if (GENERIC_SERVER_PATTERN.test(message)) return statusFallback(status ?? 500);
  

  const bareStatus = BARE_STATUS.exec(message)?.[1];
  if (bareStatus) return statusFallback(Number(bareStatus));

  const reasonStatus = REASON_PHRASE_STATUS[message.toLowerCase().replace(/\.$/, "")];
  if (reasonStatus !== undefined) return statusFallback(reasonStatus);

  return message;
}
