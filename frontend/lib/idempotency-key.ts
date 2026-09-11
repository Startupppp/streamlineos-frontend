/**
 * An idempotency key identifies an OPERATION, not a request.
 *
 * `authedFetch` mints one per HTTP call as a last-resort default, so an
 * `@Idempotent` route never 400s on a missing header — but a key minted per
 * attempt is a request id wearing the wrong name, and it makes the backend's
 * replay machinery inert. Anything a user can retry mints its key once, at the
 * operation, and sends the same one again: `hooks/common/use-idempotent-operation.ts`.
 */
export function newIdempotencyKey(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const IDEMPOTENCY_HEADER = "Idempotency-Key";
