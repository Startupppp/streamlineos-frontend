import { isApiError } from "@/lib/api-client";
import { isRecord } from "@/lib/is-record";

export type AuthErrorCode =
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_EMAIL_NOT_VERIFIED"
  | "AUTH_ACCOUNT_LOCKED"
  | "AUTH_MFA_REQUIRED"
  | "AUTH_INVALID_MFA_CODE"
  | "AUTH_SUBSCRIPTION_INACTIVE"
  | "AUTH_TOKEN_INVALID"
  | "AUTH_TOKEN_EXPIRED"
  | "AUTH_RATE_LIMITED"
  | "UNKNOWN";

export interface ParsedAuthError {
  code: AuthErrorCode;
  retryAfterSeconds?: number;
}

const KNOWN_CODES = [
  "AUTH_SUBSCRIPTION_INACTIVE",
  "AUTH_EMAIL_NOT_VERIFIED",
  "AUTH_MFA_REQUIRED",
  "AUTH_INVALID_MFA_CODE",
  "AUTH_TOKEN_INVALID",
  "AUTH_TOKEN_EXPIRED",
  "AUTH_RATE_LIMITED",
  "AUTH_INVALID_CREDENTIALS",
] as const satisfies ReadonlyArray<AuthErrorCode>;

export function parseAuthErrorCode(raw: string): ParsedAuthError {
  if (raw.startsWith("AUTH_ACCOUNT_LOCKED:")) {
    const secs = parseInt(raw.slice("AUTH_ACCOUNT_LOCKED:".length), 10);
    return { code: "AUTH_ACCOUNT_LOCKED", retryAfterSeconds: isNaN(secs) ? 900 : secs };
  }
  const match = KNOWN_CODES.find((c) => c === raw);
  return { code: match ?? "UNKNOWN" };
}

const MAX_AUTH_RETRY_AFTER_SECONDS = 15 * 60;

/**
 * `AuthController.enforceRateLimit` answers a 429 with
 * `details: { retryAfterSeconds }`. Returns null for anything that is not a
 * usable 429 retry-after, so the caller keeps its own default rather than
 * inheriting a zero, a negative or a value that would strand the control.
 */
export function readRetryAfterSeconds(error: unknown): number | null {
  if (!isApiError(error) || error.status !== 429) return null;
  if (!isRecord(error.details)) return null;
  const raw = error.details.retryAfterSeconds;
  const seconds =
    typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : Number.NaN;
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.min(Math.ceil(seconds), MAX_AUTH_RETRY_AFTER_SECONDS);
}
