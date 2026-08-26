# 03 — A sweep reports what it did

**What to build:** An operator can see how long each sweep took per organisation and what failed, so growth is visible before it becomes an incident and a failure names the tenant and record rather than disappearing.

**Blocked by:** 02 — The remaining tenant-growing sweeps are set-based

**Status:** in-progress

## Acceptance criteria

- [x] Duration is recorded per sweep per organisation. — `backend/src/modules/cron/cron-leave.service.ts:44,60-66`: `sweepStart = Date.now()` before the per-org work, `logger.info("[monthly-leave-reset] org sweep complete", { orgId, durationMs: Date.now() - sweepStart, ... })` after.
- [x] A failure names the tenant and the record. — `backend/src/common/tenant/for-each-org.ts:54-63`: `logger.error(...)` carries `{ orgId: org.id, error, cause, code }`.
- [x] An error logs its underlying cause, not only its surface message — a driver failure inside a query template says nothing useful on its own. — `for-each-org.ts:54-63` extracts `err.cause` (Drizzle's own `.message` is only `"Failed query: <sql>"`) and the Postgres error `code` off the cause object.
- [x] One tenant's failure does not abort the run. — `for-each-org.ts:41-64`: each org runs inside its own `try/catch`; a caught error increments `failed` and the `for` loop continues to the next org.
- [ ] Sweeps whose queries grow are covered by read budgets. — the general budget system (c11) covers ~40 hot paths but not the two leave-accrual queries specifically (`hr_leave_ledger` dedup check, `leave_balances` lookup). Adding them requires extending `run-read-cost-budgets.mjs`'s fixture-gathering query with `leaveTypeIds`/`period`, which doesn't exist in the current fixture set — deferred as a small, well-scoped follow-up rather than added without proper wiring. Candidate entries (query shape, table, proposed ceiling) are recorded in this batch's session notes for whoever picks this up.

## Todo

- [x] Emit through the structured logger once c20-03 lands — `common/logger/logger.service.ts`'s `logger`, used throughout
- [x] Assert the cause is logged, not just an error — `for-each-org.ts:54-63` (pre-existing, not newly added)
- [ ] Add budget entries for the growing queries — deferred, see above
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md) — deferred until the budget-entries item closes

**Verification note (orchestrator, 2026-08-26):** four of five criteria were already satisfied by pre-existing `forEachOrg` infrastructure before this batch; only the per-sweep duration log was newly added (`cron-leave.service.ts:44,60-66`). Verified directly against source.

---

PRD: [`c14 — Background sweeps operate on sets, not on rows`](../prd.md) · Candidate index: [`../README.md`](../README.md)
