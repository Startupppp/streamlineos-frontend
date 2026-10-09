# 13 — Validation, errors, and failure states

Status: Planned uniform contract

## Validation ownership

Client validation gives immediate feedback; server validation is authoritative. Shared field semantics may be generated from one schema, but server DTOs remain independently enforced at the trust boundary. Database constraints protect invariants under concurrency. Provider errors are translated at the adapter seam.

Required validation includes type/length/range, enum/catalog membership, date order/timezone, currency/minor units, duplicate key/title where applicable, same-tenant relationships, lifecycle transition, expected revision, plan quota, grant expiry/capability, and file/MIME/size rules.

## Error catalog

| Code | HTTP | User message pattern | Retry? | Recovery/UI |
|---|---:|---|---|---|
| `VALIDATION_FAILED` | 422 | “Check the highlighted fields.” | After edit | Preserve input, focus summary/first field, show path messages. |
| `AUTH_REQUIRED` | 401 | “Your session has expired. Sign in to continue.” | After auth | Save safe local draft; redirect with validated callback. |
| `ACCESS_DENIED` | 403 | “You do not have permission to do this.” | No | Disable/remove action after refresh; link to access request if supported. |
| `RECORD_NOT_FOUND` | 404 | “This record is unavailable.” | No | Safe parent link; no hidden metadata. |
| `REVISION_CONFLICT` | 409 | “This changed while you were editing.” | Manual/merge | Show latest versus local fields; reload, copy, or reapply. |
| `DUPLICATE_RECORD` | 409 | “A record with this key already exists.” | After edit | Link existing only when authorized. |
| `INVALID_TRANSITION` | 409 | “This record cannot move from {from} to {to}.” | After state refresh | Refresh workflow and show allowed destinations. |
| `WIP_LIMIT_EXCEEDED` | 409 | “This column has reached its work limit.” | After capacity change | Offer authorized override/request; roll back optimistic move. |
| `PLAN_LIMIT_REACHED` | 409/402 by existing platform convention | “Your plan limit has been reached.” | After quota change | Show usage/limit and authorized plan/top-up handoff; never imply permission expansion. |
| `IDEMPOTENCY_MISMATCH` | 409 | “This retry does not match the original request.” | New key only | Stop automatic retry; preserve form. |
| `RATE_LIMITED` | 429 | “Too many requests. Try again in {seconds}.” | Yes | Respect `Retry-After`; countdown for user-triggered action. |
| `DEPENDENCY_UNAVAILABLE` | 503 | “{Owning module/provider} is temporarily unavailable.” | If safe | Keep Build source unchanged; retry or open operation status. |
| `JOB_PARTIAL` | 200/202 status resource | “Completed with {failed} items needing attention.” | Failed rows | Download/review failures and retry selected rows idempotently. |
| `OFFLINE` | client state | “You are offline. Changes are saved locally where supported.” | On reconnect | Do not claim server save; show queued/draft state. |
| `PERMISSION_REVOKED` | 403/404 | “Your access changed while this page was open.” | No | Stop polling, clear protected cache, preserve only safe unsent text. |

Unknown failures use a safe reference ID and “We could not complete this action. Retry or contact support with reference {id}.” Generic language is the fallback, not the default for known errors.

## Browser/history/retry failures

- Refresh on a canonical detail URL reloads the same record and selected safe tab; transient sheet-only state is reconstructed from URL or omitted.
- Browser Back closes the pane/selection before leaving the collection.
- Network timeout leaves the operation as unknown until idempotency/status lookup resolves it; do not blindly create again.
- Partial cross-module failure returns the committed Build record plus an operation/error state for the owning-module handoff; no fake local invoice/time/payment record.
- Cache or replica lag after mutation is fenced by revision/primary read so the UI does not revert to an older value.
- Session/access loss stops background refetch from repeatedly showing toasts.

## Logging

Log machine code, request/correlation ID, operation, scoped identifiers, retryability, dependency, and stack server-side under the central redaction policy. User responses omit stack/SQL/provider body/secrets. Expected validation/denial is not logged as an application error storm.

## Delivery checklist

Track completion in the [requirement ledger](REQUIREMENT-LEDGER.md) and [work claims](WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.
- [ ] Verify each error maps to a useful UI state and preserves user input, pane context, Back/refresh behavior, safe retry, and accessibility announcement.
- [ ] Exercise permission loss, stale revision, duplicate submission, offline/resume, partial background job, rate limit, and provider outage without leaking private details.
