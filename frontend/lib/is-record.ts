/**
 * The one record narrowing, in a module with no imports of its own.
 *
 * Every hand-rolled client that does not go through `parseApiResponse` — the
 * portal client, the public Sign client, the server-side auth-session bridge —
 * reads a parsed body field by field, and each had written
 * `body as Record<string, unknown>` to do it. That is an assertion about a value
 * that has just arrived from the network, which is the one place an assertion is
 * worth least: it moves nothing into the checked world, it only stops the
 * compiler asking.
 *
 * It lives here rather than in `lib/api-envelope.ts` because `auth-session.ts`
 * runs on the server and importing the envelope would drag the browser error
 * reporter into the NextAuth module graph for the sake of a three-line guard.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
