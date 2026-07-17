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
