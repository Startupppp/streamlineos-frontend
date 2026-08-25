# c15 — Outbound I/O leaves the request transaction

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 0** · 5 tickets, 0 retired.

Only two of 363 explicit transaction blocks contain a network call — the code is careful. But `withTenant` wraps **the entire request handler** in a transaction so the tenant GUC can be set, which means every outbound call anywhere in a handler holds a pooled connection for its full duration. Razorpay, R2 and Resend are all called with no timeout, so the worst case is unbounded.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [An outbound call cannot be untimed](issues/01-an-outbound-call-cannot-be-untimed.md) | — | ready-for-agent |
| 02 | [The three providers adopt the deadline](issues/02-the-three-providers-adopt-the-deadline.md) | 01 | ready-for-agent |
| 03 | [A blob upload does not hold a database connection](issues/03-a-blob-upload-does-not-hold-a-connection.md) | 02 | ready-for-agent |
| 04 | [Post-commit work carries tenant context](issues/04-post-commit-work-carries-tenant-context.md) | — | ready-for-agent |
| 05 | [The API surface is not published in production](issues/05-the-api-surface-is-not-published.md) | — | ready-for-agent |

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
