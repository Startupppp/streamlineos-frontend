# c22 — Scheduled work runs once, and a deploy sheds no requests

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 1** · 4 tickets, 4 done.

Every item here is a **missing guarantee on a sound design**. Crons as secret-guarded HTTP endpoints is better than in-process timers; it just never got exclusivity. Startup validation is stricter than most production applications; shutdown simply does its two steps in the wrong order. Three write paths are already correctly serialized — two more are unverified and both touch money or stock.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | A scheduled job runs once | — | **done** |
| 02 | A deploy sheds no requests | — | **done** |
| 03 | Invoice numbering is race-free | — | **done** |
| 04 | Stock adjustments serialize | — | **done** |

## Closed ticket digests

**01 — A scheduled job runs once.** `CronLeaseService` (`backend/src/modules/cron/cron-lease.service.ts`) wraps each job handler in a Redis `SET … NX EX` lease; a refused duplicate logs a warning and returns `{ success: true, skipped: true }` so the scheduler does not retry. Lease windows are per-job (outbox 120 s, billing 300 s, build snapshots 600 s). Per-org commits inside `outbox-publisher.service.ts` remain independent so a crash mid-run leaves already-committed orgs processed. Spec `cron-lease.service.spec.ts` races two `withLease` calls with `Promise.all` against a `Map`-backed fake that enforces real NX semantics; a negative control (NX bypassed) produces 2 executions, proving the suite is not vacuous.

**02 — A deploy sheds no requests.** Shutdown hook order corrected so readiness flips unhealthy and a settling delay elapses *before* the connection pool drains. Liveness is kept separate so the orchestrator does not SIGKILL mid-drain. Tests assert the ordering (readiness flip → delay → drain), not merely that both health states exist.

**03 — Invoice numbering is race-free.** No code change needed. `invoices-write.service.ts` lines 95–103 already take `pg_advisory_xact_lock(hashtext(orgId || 'invoice'))` inside the transaction before the `count(*) + 1` assignment. Numbering is gapless (voided invoices are never deleted, so the count equals true row cardinality). Format is `INV-{year}-{cumulative-count}` (counter does not reset per year). Discriminating test added: `src/modules/invoices/__tests__/invoice-numbering.db.spec.ts` (env-gated `INV_DB_TESTS=1`) proves distinct numbers with the lock and a collision without it.

**04 — Stock adjustments serialize.** No code change needed. `applyAdjustmentLines` (`inv-stock-adjustments.service.ts`) routes through `stock-engine.service.ts` `executeInTx`, which issues `SELECT … FOR UPDATE` before every quantity read and write — the same lock the transfer path takes. Existing `adjustment-threshold.spec.ts` transaction mock correctly invokes its callback. Two new env-gated cases added to `src/modules/inventory/stock-engine/__tests__/stock-engine.db.spec.ts`: with `FOR UPDATE` two concurrent −10 adjustments on 20 units yield 0; without it they yield 10 (lost update), proving the test discriminates.

## Working these

Work the frontier — any ticket whose blockers are all done. A ticket marked `—` under **Blocked by** can start immediately.

Every ticket is a vertical slice: it cuts a narrow but complete path through schema, API, UI and tests, and is verifiable on its own. None is a layer.

Acceptance criteria are the contract. The **Todo** list is a suggested route and may be ignored if a better one exists — the criteria may not.
