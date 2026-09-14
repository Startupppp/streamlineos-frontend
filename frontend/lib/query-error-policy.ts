import { isApiError } from "@/lib/api-envelope";

/**
 * With no `throwOnError`, a failed read reaches the screen as `data === undefined`,
 * which every surface already spells `?? 0` or `?? []`. `/hr/comp-off` answered a
 * 500 with "0.0 days earned" — a number the user has no way to distrust. A read
 * that produced nothing must therefore reach the route error boundary rather than
 * be rendered as an absence.
 *
 * Four failures are excluded, because each already has a surface of its own and
 * an error card would only race it:
 *   · a query holding data — a failed background refresh keeps the working screen
 *   · `ABORTED` — a navigation cancelling its own request is not a failure
 *   · 401 — `authedFetch` is already signing the session out
 *   · a suspended-membership 403 — the client is already leaving for /access-suspended
 */

const ORGANIZATION_ACCESS_ERROR_CODES = new Set([
  "ORG_MEMBERSHIP_INACTIVE",
  "ORG_MEMBERSHIP_SUSPENDED",
]);

export function readErrorReachesBoundary(
  error: unknown,
  query: { readonly state: { readonly data: unknown } },
): boolean {
  if (query.state.data !== undefined) return false;
  if (!isApiError(error)) return true;
  if (error.code === "ABORTED") return false;
  if (error.status === 401) return false;
  if (
    error.status === 403 &&
    error.code !== undefined &&
    ORGANIZATION_ACCESS_ERROR_CODES.has(error.code)
  )
    return false;
  return true;
}


export const INLINE_READ_ERROR = { throwOnError: false } as const;

export function isTransientNetworkError(error: unknown): boolean {
  if (!isApiError(error)) return false;
  if (error.code === "NETWORK_ERROR" || error.code === "TIMEOUT") return true;
  if (error.status === 502 || error.status === 503 || error.status === 504)
    return true;
  return false;
}
