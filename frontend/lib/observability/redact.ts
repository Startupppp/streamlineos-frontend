/**
 * Makes a value safe to send to an error tracker.
 *
 * The browser is the easiest place to leak a token by accident: a failed request
 * carries its own headers, and a component's props are attached to whatever
 * error it threw. Deny-by-default on anything whose key suggests a secret.
 */

const MAX_DEPTH = 4;
const MAX_STRING = 1_000;
const REDACTED = "[redacted]";

const SENSITIVE_SUBSTRINGS = [
  "password",
  "passwd",
  "secret",
  "token",
  "authorization",
  "cookie",
  "apikey",
  "credential",
  "sessionid",
  "aadhaar",
  "pannumber",
  "cardnumber",
] as const;

const SENSITIVE_EXACT = new Set(["pan", "otp", "cvv", "ssn", "pin"]);

function isSensitive(key: string): boolean {
  const normalised = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (SENSITIVE_EXACT.has(normalised)) return true;
  return SENSITIVE_SUBSTRINGS.some((needle) => normalised.includes(needle));
}

function truncate(value: string): string {
  if (value.length <= MAX_STRING) return value;
  return `${value.slice(0, MAX_STRING)}… [truncated ${value.length - MAX_STRING} chars]`;
}

export function redact(value: unknown): unknown {
  return walk(value, 0, new WeakSet());
}

function walk(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return truncate(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "function") return "[function]";
  if (typeof value !== "object") return String(value);

  if (value instanceof Error) {
    return {
      name: value.name,
      message: truncate(value.message),
      stack: typeof value.stack === "string" ? truncate(value.stack) : undefined,
    };
  }

  if (seen.has(value)) return "[circular]";
  if (depth > MAX_DEPTH) return "[depth-limit]";
  seen.add(value);

  try {
    if (Array.isArray(value)) {
      return value.slice(0, 100).map((entry) => walk(entry, depth + 1, seen));
    }

    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isSensitive(key) ? REDACTED : walk(entry, depth + 1, seen);
    }
    return out;
  } finally {
    seen.delete(value);
  }
}
