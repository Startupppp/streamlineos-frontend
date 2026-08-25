import type { QueryKey } from "@tanstack/react-query";

/**
 * The app's QueryClient hashes every key with the signed-in identity prefixed,
 * so one person's cached rows can never be read under another's scope. The
 * sibling `key={scope}` remount on the provider is the other half of that guard.
 *
 * This lives in a neutral module — no `"use client"`, no `"server-only"` —
 * because BOTH sides must hash identically. A server prefetch that dehydrates
 * with the default hash writes `["streamlineos","access","me",…]` while the app
 * looks up `["authenticated:org:user",["streamlineos","access","me",…]]`, and
 * the entry is hydrated into the cache under a string nothing ever computes.
 * Typecheck, tests and the build all pass; the prefetch is simply dead.
 *
 * That is exactly what happened to all five prefetch factories. Import from
 * here rather than retyping either function.
 */

export const LOADING_SCOPE = "loading";
export const UNAUTHENTICATED_SCOPE = "unauthenticated";

/**
 * The scope for a signed-in person. The `?? ""` fallbacks are part of the
 * contract, not defensive padding — the client computes the string from a
 * session that may be missing either field, and the server must produce the
 * same string for the same session or the caches silently stop matching.
 */
export function authenticatedScope(
  orgId: string | null | undefined,
  userId: string | null | undefined,
): string {
  return `authenticated:${orgId ?? ""}:${userId ?? ""}`;
}

export function scopedQueryKeyHashFn(
  scope: string,
): (queryKey: QueryKey) => string {
  return (queryKey) => JSON.stringify([scope, queryKey]);
}
