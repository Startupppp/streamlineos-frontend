/**
 * The single answer to "is this session's user active", for both branches of the
 * NextAuth `session` callback.
 *
 * It exists because those two branches disagreed. The happy path read
 * `fresh?.isActive ?? (token.isActive as boolean)` and the catch path read
 * `(token.isActive as boolean | undefined) ?? true`, so a token minted before
 * the claim existed resolved to `undefined` when the backend ANSWERED and to
 * `true` when the backend THREW — a successful session resolution was strictly
 * more likely to present a live user as deactivated than a failed one. The
 * `as boolean` is what allowed it: the declared type kept saying `boolean`
 * while the value was `undefined`, and `lib/rbac/require-permission.ts` only
 * survives that by comparing `=== false` rather than by truthiness.
 *
 * Absence is not evidence of deactivation, so an unreadable claim resolves
 * `true` — the same default the jwt callback already applies when it stamps
 * `token.isActive = user.isActive ?? true`. A `typeof` narrowing, not a cast,
 * so the boolean the signature promises is the boolean the caller gets.
 *
 * It is a leaf module on purpose: `lib/auth-session.ts` pulls in `jose`, which
 * ships browser ESM that jest will not transform, so a helper living there is
 * unreachable from a spec.
 */
export function resolveSessionIsActive(
  fresh: { isActive: boolean } | null | undefined,
  tokenIsActive: unknown,
): boolean {
  if (fresh) return fresh.isActive;
  return typeof tokenIsActive === "boolean" ? tokenIsActive : true;
}
