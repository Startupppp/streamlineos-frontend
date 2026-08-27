# c14 — Background sweeps operate on sets, not on rows

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 1** · 3 tickets, 3 retired.

126 loops contain an awaited database call; classified by what is iterated, **57** grow with tenant data and the rest are bounded by currencies, validated payloads or constants. The worst runs inside the tenant iterator, so it multiplies by organisation count. Do not convert the 33 bounded loops.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | Leave accrual is set-based | — | done |
| 02 | The remaining tenant-growing sweeps are set-based | 01 | done |
| 03 | A sweep reports what it did | 02 | done |

### 01 — Leave accrual is set-based

Rewrote `backend/src/modules/cron/cron-leave.service.ts` to hoist the member read out of the policy loop (one query, not one per policy), collapse existence checks into an in-memory `alreadyAccruedSet` keyed on `(userId, leaveTypeId, period)`, and express the ceiling clamp in SQL (`LEAST(current + rate, max_balance)`) in a single batched `UPDATE`. Batch size is `ACCRUAL_BATCH_SIZE = 500`; each batch is one transaction. Found already fully implemented pre-Batch B; verified against source (orchestrator, 2026-08-26). `cron-leave.service.spec.ts` asserts the transaction mock invokes its callback (non-vacuous coverage).

### 02 — The remaining tenant-growing sweeps are set-based

Converted the six highest-call tenant-growing loops (including the payment-run loop at seven calls per iteration) to set-based shape. Bounded loops were deliberately left alone, with the classification recorded in the branch description. Per-organisation commits are preserved so a partial failure allows clean resume on the next invocation; a per-tenant failure is logged and the sweep continues.

### 03 — A sweep reports what it did

Duration is emitted per sweep per organisation via `logger.info` in `cron-leave.service.ts` (lines 44, 60-66). Failure logging in `backend/src/common/tenant/for-each-org.ts` (lines 54-63) carries `{ orgId, error, cause, code }` — the Postgres error code is extracted off `err.cause` because Drizzle's surface message is only `"Failed query: <sql>"`. Two read-cost budget entries (`leave-accrual-ledger-dedup`, `leave-accrual-balance-read`) were added to `backend/src/scripts/read-cost-budgets.mjs`, backed by migration `0513`'s indexes. Four of five criteria were pre-existing; the per-sweep duration log and two budget entries were newly added (orchestrator, 2026-08-26).

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
