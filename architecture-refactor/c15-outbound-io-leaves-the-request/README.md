# c15 — Outbound I/O leaves the request transaction

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 0 · 6 tickets · all closed.**

Only two of 363 explicit transaction blocks contain a network call — the code is careful. But `withTenant` wraps **the entire request handler** in a transaction so the tenant GUC can be set, which means every outbound call anywhere in a handler holds a pooled connection for its full duration. Razorpay, R2 and Resend are all called with no timeout, so the worst case is unbounded.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | An outbound call cannot be untimed | — | **done** |
| 02 | The three providers adopt the deadline | 01 | **done** |
| 03 | A blob upload does not hold a database connection | 02 | **done** |
| 04 | Post-commit work carries tenant context | — | **done** |
| 05 | The API surface is not published in production | — | **done** |
| 06 | One SSRF guard, not two | — | **done** |

---

## Ticket digests

**01 — An outbound call cannot be untimed.** Built a shared outbound HTTP helper that enforces a timeout at the type level (an untimed call does not typecheck), routes every destination through the existing SSRF guard, and records provider/duration/outcome per call. Tested against a genuinely hanging server, not a mock that returns instantly.

**02 — The three providers adopt the deadline.** Razorpay, R2 blob storage, and Resend email each call through the shared helper with per-provider timeouts. Storage client hoisted to constructor (one instance, not per-call). Payment timeouts leave the charge recorded rather than unrecorded; a timeout is reported, not swallowed.

**03 — A blob upload does not hold a database connection.** Payroll batch file upload decoupled from the DB transaction: the row commits first (inside `db.transaction`), then the upload runs in `registerAfterCommit` at `storage-onboarding.controller.ts:114-116`, so the pooled connection is released before bytes move. Pre-generated URL is returned to the caller immediately after commit. Fixtures in `storage-onboarding.controller.spec.ts` were corrected — the original suite passed invalid enum values (`NATIONAL_ID`/`PASSPORT`), so the three connection-decoupling cases never executed; fixed to `ID_PROOF`, 7 passing. The three-mechanism rule (inline · `OutboxWriter.emit` · `registerAfterCommit`) is codified in `backend/CLAUDE.md §4`.

**04 — Post-commit work carries tenant context.** Root cause of the notification-delivery production incident: after-commit hooks drained after `withTenant` returned, so the DB handle carried no tenant GUC and died 42501. Fix at `tenant-context.interceptor.ts:79-84`: each hook now runs inside `runInNewTenantTransaction(orgId)`. Verified on a booted process — zero 42501 across 112 per-org sweep iterations (notification-delivery-claim, payroll-jobs-claim, payroll-stale-lock-reclaim). Streaming chat route was already correct via `@NoTenantTransaction()`; a regression test added to `tenant-context.interceptor.spec.ts` covers the shape. Note: hooks that already call `runInNewTenantTransaction` themselves now open two independent transactions (idle outer + real inner) — wasteful but not broken; a cleanup candidate.

**05 — The API surface is not published in production.** Verified already-complete; no code changes needed. The entire Swagger block in `backend/src/main.ts:90` is inside `if (isDevelopment)` — never registered outside development. Ably API key stays server-side only (`ably.service.ts:18`); clients receive scoped expiring token requests. No `NEXT_PUBLIC_ABLY` / `ABLY_API_KEY` present anywhere in `frontend/` source (only a vendor sample in `node_modules/ably`).

**06 — One SSRF guard, not two.** Inventory webhook validation already calls `checkWebhookUrl` from `common/security/ssrf-guard.ts`; local `blockedIpReason` and its helpers are gone from `modules/inventory/`. A case-by-case diff was performed against the recovered retired implementation (27 blocked + 7 boundary forms captured in `ssrf-guard.spec.ts`). One gap found and fixed: the shared sync guard did not block `*.localhost` subdomains — fixed at `ssrf-guard.ts:136-139`, pinned by the "blocks a localhost subdomain" spec. The shared guard is a strict superset of the retired local copy on all address forms; 56 specs pass.

---

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
